from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.event import EventStatus, EventType


class FeaturedEventOrganiser(BaseModel):
    id: UUID
    display_name: str
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class FeaturedEventResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    event_type: EventType
    status: EventStatus
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    is_all_day: bool = False
    location_name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    cover_image_url: Optional[str] = None
    max_attendees: Optional[int] = None
    organiser_id: UUID
    organiser: Optional[FeaturedEventOrganiser] = None
    save_count: int = 0
    is_admin_pick: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PlatformStatsResponse(BaseModel):
    total_users: int
    total_organisers: int
    featured_event: Optional[FeaturedEventResponse] = None


class SetFeaturedEventRequest(BaseModel):
    event_id: UUID


class FeaturedEventSettingResponse(BaseModel):
    event_id: Optional[UUID] = None
    message: str
