from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class SavedEvent(UUIDMixin, TimestampMixin, Base):
    """Join table: a user saves an event to their personal calendar."""

    __tablename__ = "saved_events"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id"), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="saved_events", lazy="selectin")
    event = relationship("Event", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("user_id", "event_id", name="uq_saved_events_user_event"),
    )

    def __repr__(self) -> str:
        return f"<SavedEvent user={self.user_id} event={self.event_id}>"
