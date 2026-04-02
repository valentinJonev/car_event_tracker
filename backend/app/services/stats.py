from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event, EventStatus
from app.models.platform_setting import PlatformSetting
from app.models.saved_event import SavedEvent
from app.models.user import User, UserRole

FEATURED_EVENT_KEY = "featured_event_id"


async def get_total_users(db: AsyncSession) -> int:
    """Count all active users on the platform."""
    result = await db.execute(
        select(func.count(User.id)).where(User.is_active.is_(True))
    )
    return result.scalar() or 0


async def get_total_organisers(db: AsyncSession) -> int:
    """Count all active users with the organiser or admin role."""
    result = await db.execute(
        select(func.count(User.id)).where(
            User.is_active.is_(True),
            User.role.in_([UserRole.ORGANISER, UserRole.ADMIN]),
        )
    )
    return result.scalar() or 0


async def get_event_save_count(db: AsyncSession, event_id: UUID) -> int:
    """Count how many users have saved a specific event."""
    result = await db.execute(
        select(func.count(SavedEvent.id)).where(SavedEvent.event_id == event_id)
    )
    return result.scalar() or 0


async def get_admin_featured_event_id(db: AsyncSession) -> UUID | None:
    """Get the admin-overridden featured event ID, if set."""
    result = await db.execute(
        select(PlatformSetting.value).where(PlatformSetting.key == FEATURED_EVENT_KEY)
    )
    value = result.scalar_one_or_none()
    if value:
        try:
            return UUID(value)
        except (ValueError, AttributeError):
            return None
    return None


async def set_admin_featured_event(db: AsyncSession, event_id: UUID) -> None:
    """Set or update the admin-overridden featured event."""
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.key == FEATURED_EVENT_KEY)
    )
    setting = result.scalar_one_or_none()

    if setting:
        setting.value = str(event_id)
    else:
        setting = PlatformSetting(key=FEATURED_EVENT_KEY, value=str(event_id))
        db.add(setting)

    await db.flush()


async def clear_admin_featured_event(db: AsyncSession) -> None:
    """Remove the admin-overridden featured event (fall back to most-saved)."""
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.key == FEATURED_EVENT_KEY)
    )
    setting = result.scalar_one_or_none()

    if setting:
        await db.delete(setting)
        await db.flush()


async def get_most_saved_event_id(db: AsyncSession) -> UUID | None:
    """Find the published event with the most saves."""
    result = await db.execute(
        select(SavedEvent.event_id, func.count(SavedEvent.id).label("save_count"))
        .join(Event, SavedEvent.event_id == Event.id)
        .where(Event.status == EventStatus.PUBLISHED)
        .group_by(SavedEvent.event_id)
        .order_by(func.count(SavedEvent.id).desc())
        .limit(1)
    )
    row = result.first()
    return row[0] if row else None


async def get_featured_event(
    db: AsyncSession,
) -> tuple[Event | None, int, bool]:
    """Return the featured event, its save count, and whether it's an admin pick.

    Logic:
    1. If admin has set a featured event override → use that (if the event exists
       and is published).
    2. Otherwise → the published event with the most saves.
    3. If no events have saves → the most recently published event.

    Returns (event, save_count, is_admin_pick).
    """
    # 1. Check admin override
    admin_event_id = await get_admin_featured_event_id(db)
    if admin_event_id:
        result = await db.execute(select(Event).where(Event.id == admin_event_id))
        event = result.scalar_one_or_none()
        if event and event.status == EventStatus.PUBLISHED:
            save_count = await get_event_save_count(db, event.id)
            return event, save_count, True

    # 2. Most saved published event
    most_saved_result = await db.execute(
        select(SavedEvent.event_id, func.count(SavedEvent.id).label("save_count"))
        .join(Event, SavedEvent.event_id == Event.id)
        .where(Event.status == EventStatus.PUBLISHED)
        .group_by(SavedEvent.event_id)
        .order_by(func.count(SavedEvent.id).desc())
        .limit(1)
    )
    row = most_saved_result.first()
    if row:
        event_id, save_count = row[0], row[1]
        result = await db.execute(select(Event).where(Event.id == event_id))
        event = result.scalar_one_or_none()
        if event:
            return event, save_count, False

    # 3. Fallback: most recently published event
    result = await db.execute(
        select(Event)
        .where(Event.status == EventStatus.PUBLISHED)
        .order_by(Event.created_at.desc())
        .limit(1)
    )
    event = result.scalar_one_or_none()
    if event:
        save_count = await get_event_save_count(db, event.id)
        return event, save_count, False

    return None, 0, False
