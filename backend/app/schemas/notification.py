from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.notification import NotificationChannelType, NotificationStatus


class NotificationEventSnapshot(BaseModel):
    """Lightweight event data embedded in each notification."""

    id: UUID
    title: str
    event_type: str
    start_datetime: datetime
    organiser_name: str
    is_all_day: bool = False


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    event_id: UUID
    channel: NotificationChannelType
    status: NotificationStatus
    message: Optional[str] = None
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    event: Optional[NotificationEventSnapshot] = None

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    offset: int
    limit: int


class PushSubscriptionRequest(BaseModel):
    subscription: dict  # Web Push subscription JSON object
