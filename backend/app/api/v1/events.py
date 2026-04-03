from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

import logging

from app.api.deps import get_current_user, get_optional_current_user, require_role

logger = logging.getLogger(__name__)
from app.database import get_db
from app.models.event import EventStatus, EventType
from app.models.user import User, UserRole
from app.schemas.event import (
    EventCreate,
    EventListResponse,
    EventResponse,
    EventUpdate,
)
from app.services.event import (
    can_modify_event,
    cancel_event,
    create_event,
    delete_event,
    find_nearby_events,
    get_event_by_id,
    list_events,
    update_event,
)

router = APIRouter()


@router.get("/", response_model=EventListResponse)
async def get_events(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    event_type: Optional[EventType] = None,
    event_status: Optional[EventStatus] = Query(None, alias="status"),
    organiser_id: Optional[UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    events, total = await list_events(
        db=db,
        offset=offset,
        limit=limit,
        event_type=event_type,
        status=event_status,
        organiser_id=organiser_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
        current_user_id=current_user.id if current_user else None,
    )
    return EventListResponse(items=events, total=total, offset=offset, limit=limit)


@router.get("/nearby", response_model=EventListResponse)
async def get_nearby_events(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(50.0, ge=1, le=500),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    event_type: Optional[EventType] = None,
    organiser_id: Optional[UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    events, total = await find_nearby_events(
        db=db,
        latitude=lat,
        longitude=lng,
        radius_km=radius_km,
        offset=offset,
        limit=limit,
        event_type=event_type,
        organiser_id=organiser_id,
        date_from=date_from,
        date_to=date_to,
        current_user_id=current_user.id if current_user else None,
    )
    return EventListResponse(items=events, total=total, offset=offset, limit=limit)


@router.get("/{event_id}/calendar")
async def get_event_calendar(event_id: UUID, db: AsyncSession = Depends(get_db)):
    """Download an .ics calendar file for an event."""
    event = await get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    from app.services.calendar import generate_ics

    ics_content = generate_ics(event)
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="{event.title}.ics"'
        },
    )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    event = await get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    return event


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_new_event(
    data: EventCreate,
    current_user: User = Depends(require_role(UserRole.ORGANISER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    event = await create_event(db, data, current_user.id)

    # Auto-save the event to the organiser's personal calendar
    from app.services.saved_event import save_event
    await save_event(db, current_user.id, event.id)

    # Trigger notifications if event is published on creation
    if event.status.value == "published":
        try:
            from app.tasks.notifications import send_event_notifications
            send_event_notifications.delay(str(event.id))
        except Exception as e:
            logger.warning(f"Failed to queue notification task: {e}")
    return event


@router.put("/{event_id}", response_model=EventResponse)
async def update_existing_event(
    event_id: UUID,
    data: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    if not can_modify_event(current_user, event):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this event",
        )

    # Capture old status before update to decide what kind of notification to send
    old_status = event.status

    updated = await update_event(db, event, data)

    # Determine whether and what type of notification to send
    try:
        from app.tasks.notifications import send_event_notifications

        new_status = updated.status
        was_published = old_status.value == "published"
        is_published = new_status.value == "published"

        if not was_published and is_published:
            # Draft/cancelled → published = first-time publish
            send_event_notifications.delay(str(updated.id), "new")
        elif was_published and is_published:
            # Already published and content updated
            # Only notify if there are actual content changes (not just status re-sent)
            update_fields = data.model_dump(exclude_unset=True)
            content_fields = {
                k: v
                for k, v in update_fields.items()
                if k != "status"
            }
            if content_fields:
                send_event_notifications.delay(str(updated.id), "updated")
    except Exception as e:
        logger.warning(f"Failed to queue notification task: {e}")

    return updated


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_event(
    event_id: UUID,
    permanent: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    if not can_modify_event(current_user, event):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this event",
        )

    can_permanently_delete = current_user.role == UserRole.ADMIN or (
        event.organiser_id == current_user.id and event.status == EventStatus.DRAFT
    )

    if permanent:
        if not can_permanently_delete:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to permanently delete this event",
            )
        await delete_event(db, event)
    else:
        await cancel_event(db, event)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
