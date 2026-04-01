from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.notification import NotificationStatus
from app.models.user import User
from app.schemas.notification import (
    NotificationEventSnapshot,
    NotificationListResponse,
    NotificationResponse,
    PushSubscriptionRequest,
)
from app.services.notification import (
    get_notification_by_id,
    list_user_notifications,
    mark_all_as_read,
    mark_as_read,
    save_push_subscription,
)

router = APIRouter()


def _build_notification_response(notification) -> NotificationResponse:
    """Build a NotificationResponse with the nested event snapshot."""
    event_snapshot = None
    if notification.event is not None:
        evt = notification.event
        organiser_name = "Unknown"
        if evt.organiser is not None:
            organiser_name = evt.organiser.display_name or evt.organiser.email
        event_snapshot = NotificationEventSnapshot(
            id=evt.id,
            title=evt.title,
            event_type=(
                evt.event_type.value
                if hasattr(evt.event_type, "value")
                else evt.event_type
            ),
            start_datetime=evt.start_datetime,
            organiser_name=organiser_name,
            is_all_day=getattr(evt, "is_all_day", False),
        )

    return NotificationResponse(
        id=notification.id,
        user_id=notification.user_id,
        event_id=notification.event_id,
        channel=notification.channel,
        status=notification.status,
        message=notification.message,
        sent_at=notification.sent_at,
        created_at=notification.created_at,
        updated_at=notification.updated_at,
        event=event_snapshot,
    )


@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[NotificationStatus] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notifications, total = await list_user_notifications(
        db, current_user.id, offset, limit, status_filter
    )
    return NotificationListResponse(
        items=[_build_notification_response(n) for n in notifications],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notification = await get_notification_by_id(db, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only read your own notifications",
        )
    updated = await mark_as_read(db, notification)
    return _build_notification_response(updated)


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await mark_all_as_read(db, current_user.id)
    return {"message": f"Marked {count} notifications as read", "count": count}


@router.post("/push/subscribe", status_code=status.HTTP_200_OK)
async def register_push_subscription(
    data: PushSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await save_push_subscription(db, current_user, data.subscription)
    return {"message": "Push subscription registered successfully"}
