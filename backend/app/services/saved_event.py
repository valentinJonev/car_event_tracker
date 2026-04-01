from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, func, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_event import SavedEvent
from app.models.event import Event, EventStatus


async def save_event(
    db: AsyncSession, user_id: UUID, event_id: UUID
) -> SavedEvent:
    """Add an event to the user's personal calendar. Returns existing if already saved."""
    # Check if already saved
    existing = await get_saved_event(db, user_id, event_id)
    if existing:
        return existing

    saved = SavedEvent(user_id=user_id, event_id=event_id)
    db.add(saved)
    await db.flush()
    await db.refresh(saved)
    return saved


async def unsave_event(
    db: AsyncSession, user_id: UUID, event_id: UUID
) -> bool:
    """Remove an event from the user's personal calendar. Returns True if removed."""
    result = await db.execute(
        delete(SavedEvent).where(
            and_(SavedEvent.user_id == user_id, SavedEvent.event_id == event_id)
        )
    )
    return result.rowcount > 0


async def get_saved_event(
    db: AsyncSession, user_id: UUID, event_id: UUID
) -> SavedEvent | None:
    """Check if a specific event is saved by the user."""
    result = await db.execute(
        select(SavedEvent).where(
            and_(SavedEvent.user_id == user_id, SavedEvent.event_id == event_id)
        )
    )
    return result.scalar_one_or_none()


async def list_saved_events(
    db: AsyncSession,
    user_id: UUID,
    offset: int = 0,
    limit: int = 20,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> tuple[list[SavedEvent], int]:
    """List saved events for a user, optionally filtered by date range."""
    query = (
        select(SavedEvent)
        .join(Event, SavedEvent.event_id == Event.id)
        .where(SavedEvent.user_id == user_id)
    )
    count_query = (
        select(func.count(SavedEvent.id))
        .join(Event, SavedEvent.event_id == Event.id)
        .where(SavedEvent.user_id == user_id)
    )

    # Exclude draft events (the organiser may have un-published it)
    filters = [Event.status != EventStatus.DRAFT]

    if date_from:
        filters.append(Event.start_datetime >= date_from)
    if date_to:
        filters.append(Event.start_datetime <= date_to)

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Event.start_datetime.asc()).offset(offset).limit(limit)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def list_all_saved_events_for_feed(
    db: AsyncSession,
    user_id: UUID,
) -> list[SavedEvent]:
    """Return ALL saved events for a user (no pagination). Used for .ics feed generation.

    Excludes draft events. Includes cancelled events so the feed can mark them
    as CANCELLED (allowing calendar apps to show the status change).
    """
    query = (
        select(SavedEvent)
        .join(Event, SavedEvent.event_id == Event.id)
        .where(
            SavedEvent.user_id == user_id,
            Event.status != EventStatus.DRAFT,
        )
        .order_by(Event.start_datetime.asc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())
