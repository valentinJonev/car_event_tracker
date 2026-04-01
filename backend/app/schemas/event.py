from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.event import EventStatus, EventType


class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    event_type: EventType
    status: EventStatus = EventStatus.DRAFT
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    is_all_day: bool = False
    location_name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = Field(None, max_length=500)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    cover_image_url: Optional[str] = Field(None, max_length=500)
    max_attendees: Optional[int] = Field(None, ge=1)


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    event_type: Optional[EventType] = None
    status: Optional[EventStatus] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    is_all_day: Optional[bool] = None
    location_name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = Field(None, max_length=500)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    cover_image_url: Optional[str] = Field(None, max_length=500)
    max_attendees: Optional[int] = Field(None, ge=1)


class OrganiserResponse(BaseModel):
    id: UUID
    display_name: str
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class EventResponse(BaseModel):
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
    organiser: Optional[OrganiserResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    items: list[EventResponse]
    total: int
    offset: int
    limit: int
