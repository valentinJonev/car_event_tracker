from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.event import EventResponse


class SavedEventResponse(BaseModel):
    id: UUID
    user_id: UUID
    event_id: UUID
    event: EventResponse
    created_at: datetime

    model_config = {"from_attributes": True}


class SavedEventListResponse(BaseModel):
    items: list[SavedEventResponse]
    total: int
    offset: int
    limit: int


class SavedEventStatusResponse(BaseModel):
    """Whether the current user has saved a specific event."""
    is_saved: bool
    saved_event_id: UUID | None = None


class CalendarFeedResponse(BaseModel):
    """The user's calendar subscription feed token and URL."""
    calendar_feed_token: str | None = None
    feed_url: str | None = None
