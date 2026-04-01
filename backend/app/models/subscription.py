from __future__ import annotations

import enum
import uuid
from typing import Optional

from sqlalchemy import String, Enum, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class FilterType(str, enum.Enum):
    ORGANISER = "organiser"
    EVENT_TYPE = "event_type"
    LOCATION = "location"


class NotificationChannel(str, enum.Enum):
    """Deprecated — notification channels are now determined by User.notification_preferences.
    Kept for backward compatibility with existing DB rows."""
    EMAIL = "email"
    PUSH = "push"
    BOTH = "both"


class Subscription(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    filter_type: Mapped[FilterType] = mapped_column(
        Enum(FilterType, values_callable=lambda e: [x.value for x in e]), nullable=False
    )
    filter_value: Mapped[str] = mapped_column(String(500), nullable=False)
    filter_meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # Deprecated: channels is no longer used for notification dispatch.
    # User.notification_preferences determines which channels to use.
    channels: Mapped[Optional[NotificationChannel]] = mapped_column(
        Enum(NotificationChannel, values_callable=lambda e: [x.value for x in e]),
        default=NotificationChannel.EMAIL,
        nullable=True,
    )

    # Relationships
    user = relationship("User", back_populates="subscriptions", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Subscription {self.filter_type}={self.filter_value}>"
