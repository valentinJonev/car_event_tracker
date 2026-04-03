from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_MakePoint, ST_SetSRID
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event, EventStatus, EventType
from app.models.notification import Notification
from app.models.saved_event import SavedEvent
from app.models.user import User, UserRole
from app.schemas.event import EventCreate, EventUpdate


async def create_event(
    db: AsyncSession, data: EventCreate, organiser_id: UUID
) -> Event:
    event = Event(
        title=data.title,
        description=data.description,
        event_type=data.event_type,
        status=data.status,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        is_all_day=data.is_all_day,
        location_name=data.location_name,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        location=f"SRID=4326;POINT({data.longitude} {data.latitude})",
        cover_image_url=data.cover_image_url,
        max_attendees=data.max_attendees,
        organiser_id=organiser_id,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


async def get_event_by_id(db: AsyncSession, event_id: UUID) -> Event | None:
    result = await db.execute(select(Event).where(Event.id == event_id))
    return result.scalar_one_or_none()


async def update_event(
    db: AsyncSession, event: Event, data: EventUpdate
) -> Event:
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(event, field, value)

    # Update location geography if lat/lng changed
    if "latitude" in update_data or "longitude" in update_data:
        lat = update_data.get("latitude", event.latitude)
        lng = update_data.get("longitude", event.longitude)
        event.location = f"SRID=4326;POINT({lng} {lat})"

    await db.flush()
    await db.refresh(event)
    return event


async def cancel_event(db: AsyncSession, event: Event) -> Event:
    """Soft delete - set status to cancelled."""
    event.status = EventStatus.CANCELLED
    await db.flush()
    await db.refresh(event)
    return event


async def delete_event(db: AsyncSession, event: Event) -> None:
    """Permanently delete an event and dependent records."""
    await db.execute(delete(SavedEvent).where(SavedEvent.event_id == event.id))
    await db.execute(delete(Notification).where(Notification.event_id == event.id))
    await db.delete(event)
    await db.flush()


async def list_events(
    db: AsyncSession,
    offset: int = 0,
    limit: int = 20,
    event_type: EventType | None = None,
    status: EventStatus | None = None,
    organiser_id: UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
    current_user_id: UUID | None = None,
) -> tuple[list[Event], int]:
    query = select(Event)
    count_query = select(func.count(Event.id))

    filters = []

    if event_type:
        filters.append(Event.event_type == event_type)
    if status:
        filters.append(Event.status == status)
    else:
        # Default visibility rules:
        # - Published / completed events: always visible
        # - Draft events: only visible to their organiser
        # - Cancelled events: visible while the event date is still in the future
        now = datetime.utcnow()
        visible = or_(
            # Published and completed are always public
            Event.status.in_([EventStatus.PUBLISHED, EventStatus.COMPLETED]),
            # Cancelled events stay visible until their start date passes
            and_(Event.status == EventStatus.CANCELLED, Event.start_datetime >= now),
        )
        # If there's an authenticated user, also include their own drafts
        if current_user_id:
            visible = or_(
                visible,
                and_(Event.status == EventStatus.DRAFT, Event.organiser_id == current_user_id),
            )
        filters.append(visible)
    if organiser_id:
        filters.append(Event.organiser_id == organiser_id)
    if date_from:
        # Include events that start in range OR end in range (multi-day events)
        if date_to:
            # Full range provided: event overlaps if it starts before range ends
            # AND it ends after range starts (standard interval overlap check)
            filters.append(
                or_(
                    and_(Event.start_datetime >= date_from, Event.start_datetime <= date_to),
                    and_(Event.end_datetime != None, Event.end_datetime >= date_from, Event.start_datetime <= date_to),
                )
            )
        else:
            # Only date_from: events starting on or after, OR multi-day events still ongoing
            filters.append(
                or_(
                    Event.start_datetime >= date_from,
                    and_(Event.end_datetime != None, Event.end_datetime >= date_from),
                )
            )
    elif date_to:
        filters.append(Event.start_datetime <= date_to)
    if search:
        search_filter = Event.title.ilike(f"%{search}%")
        filters.append(search_filter)

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = query.order_by(Event.start_datetime.asc()).offset(offset).limit(limit)
    result = await db.execute(query)
    events = list(result.scalars().all())

    return events, total


async def find_nearby_events(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    radius_km: float = 50.0,
    offset: int = 0,
    limit: int = 20,
    event_type: EventType | None = None,
    organiser_id: UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    current_user_id: UUID | None = None,
) -> tuple[list[Event], int]:
    """Find events near a geographic point within a given radius."""
    radius_meters = radius_km * 1000
    point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)

    distance_filter = func.ST_DWithin(
        Event.location, point, radius_meters
    )

    filters = [distance_filter]

    # Same visibility rules as list_events
    now = datetime.utcnow()
    visible = or_(
        Event.status.in_([EventStatus.PUBLISHED, EventStatus.COMPLETED]),
        and_(Event.status == EventStatus.CANCELLED, Event.start_datetime >= now),
    )
    if current_user_id:
        visible = or_(
            visible,
            and_(Event.status == EventStatus.DRAFT, Event.organiser_id == current_user_id),
        )
    filters.append(visible)

    if event_type:
        filters.append(Event.event_type == event_type)
    if organiser_id:
        filters.append(Event.organiser_id == organiser_id)
    if date_from:
        if date_to:
            filters.append(
                or_(
                    and_(Event.start_datetime >= date_from, Event.start_datetime <= date_to),
                    and_(Event.end_datetime != None, Event.end_datetime >= date_from, Event.start_datetime <= date_to),
                )
            )
        else:
            filters.append(
                or_(
                    Event.start_datetime >= date_from,
                    and_(Event.end_datetime != None, Event.end_datetime >= date_from),
                )
            )
    elif date_to:
        filters.append(Event.start_datetime <= date_to)

    # Count query
    count_query = select(func.count(Event.id)).where(and_(*filters))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Results sorted by distance
    distance_col = func.ST_Distance(Event.location, point).label("distance")
    query = (
        select(Event)
        .where(and_(*filters))
        .order_by(distance_col)
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    events = list(result.scalars().all())

    return events, total


def can_modify_event(user: User, event: Event) -> bool:
    """Check if a user has permission to modify an event."""
    if user.role == UserRole.ADMIN:
        return True
    return event.organiser_id == user.id
