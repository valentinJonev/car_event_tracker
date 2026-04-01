from __future__ import annotations

import secrets
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.saved_event import (
    CalendarFeedResponse,
    SavedEventListResponse,
    SavedEventResponse,
    SavedEventStatusResponse,
)
from app.services.saved_event import (
    get_saved_event,
    list_all_saved_events_for_feed,
    list_saved_events,
    save_event,
    unsave_event,
)
from app.services.event import get_event_by_id
from app.services.calendar import generate_feed

router = APIRouter()


# ── Saved events CRUD ────────────────────────────────────────────────────


@router.get("/", response_model=SavedEventListResponse)
async def get_my_calendar(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all events the current user has saved to their personal calendar."""
    items, total = await list_saved_events(
        db=db,
        user_id=current_user.id,
        offset=offset,
        limit=limit,
        date_from=date_from,
        date_to=date_to,
    )
    return SavedEventListResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{event_id}/status", response_model=SavedEventStatusResponse)
async def check_saved_status(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check whether the current user has saved a specific event."""
    saved = await get_saved_event(db, current_user.id, event_id)
    return SavedEventStatusResponse(
        is_saved=saved is not None,
        saved_event_id=saved.id if saved else None,
    )


@router.post("/{event_id}", response_model=SavedEventResponse, status_code=status.HTTP_201_CREATED)
async def add_to_calendar(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save an event to the current user's personal calendar."""
    # Verify event exists
    event = await get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    saved = await save_event(db, current_user.id, event_id)
    return saved


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_calendar(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove an event from the current user's personal calendar."""
    removed = await unsave_event(db, current_user.id, event_id)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event is not in your calendar",
        )


# ── Calendar feed (subscription link) ───────────────────────────────────


@router.post("/feed/token", response_model=CalendarFeedResponse)
async def generate_feed_token(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate (or regenerate) a secret token for the user's .ics feed URL.

    The returned ``feed_url`` can be added to Apple Calendar, Google Calendar,
    or any other calendar app that supports iCal subscriptions.  Regenerating
    the token invalidates the previous URL.
    """
    token = secrets.token_urlsafe(48)
    current_user.calendar_feed_token = token
    await db.flush()
    await db.refresh(current_user)

    base_url = str(request.base_url).rstrip("/")
    feed_url = f"{base_url}/api/v1/calendar/feed/{token}"

    return CalendarFeedResponse(
        calendar_feed_token=token,
        feed_url=feed_url,
    )


@router.delete("/feed/token", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_feed_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke the user's calendar feed token, disabling the subscription URL."""
    current_user.calendar_feed_token = None
    await db.flush()


@router.get("/feed/info", response_model=CalendarFeedResponse)
async def get_feed_info(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current user's feed token and URL (if one exists)."""
    token = current_user.calendar_feed_token
    if not token:
        return CalendarFeedResponse(calendar_feed_token=None, feed_url=None)

    base_url = str(request.base_url).rstrip("/")
    feed_url = f"{base_url}/api/v1/calendar/feed/{token}"
    return CalendarFeedResponse(calendar_feed_token=token, feed_url=feed_url)


@router.get("/feed/{token}")
async def get_calendar_feed(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — returns an .ics feed for the user identified by *token*.

    This endpoint does **not** require JWT authentication.  Calendar apps
    (Apple Calendar, Google Calendar, Thunderbird, etc.) will poll this URL
    periodically.  The feed includes all non-draft saved events for the user.
    """
    # Look up user by feed token
    result = await db.execute(
        select(User).where(
            User.calendar_feed_token == token,
            User.is_active == True,  # noqa: E712
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired feed token",
        )

    # Fetch all saved events for this user
    saved_events = await list_all_saved_events_for_feed(db, user.id)
    events = [se.event for se in saved_events]

    ics_bytes = generate_feed(events)

    return Response(
        content=ics_bytes,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": 'inline; filename="my-car-events.ics"',
            # Allow caching for 15 minutes, then revalidate
            "Cache-Control": "public, max-age=900",
        },
    )
