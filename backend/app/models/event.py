from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Optional

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    String,
    Enum,
    DateTime,
    Text,
    Float,
    Integer,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class EventType(str, enum.Enum):
    RACING = "racing"
    CAR_SHOW = "car_show"
    TRACK_DAY = "track_day"
    MEETUP = "meetup"
    DRIFT = "drift"
    DRAG = "drag"
    HILLCLIMB = "hillclimb"
    OTHER = "other"


class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class Event(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "events"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_type: Mapped[EventType] = mapped_column(
        Enum(EventType, values_callable=lambda e: [x.value for x in e]), nullable=False
    )
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, values_callable=lambda e: [x.value for x in e]),
        default=EventStatus.DRAFT,
        nullable=False,
    )

    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_datetime: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_all_day: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    location_name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )

    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    max_attendees: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    organiser_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Relationships
    organiser = relationship("User", back_populates="events", lazy="selectin")

    __table_args__ = (
        Index("idx_events_event_type", "event_type"),
        Index("idx_events_status", "status"),
        Index("idx_events_start_datetime", "start_datetime"),
    )

    def __repr__(self) -> str:
        return f"<Event {self.title}>"
