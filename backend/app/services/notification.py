from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.event import Event
from app.models.notification import (
    Notification,
    NotificationChannelType,
    NotificationStatus,
)
from app.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()


async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    event_id: UUID,
    channel: NotificationChannelType,
    message: str,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        event_id=event_id,
        channel=channel,
        status=NotificationStatus.PENDING,
        message=message,
    )
    db.add(notification)
    await db.flush()
    await db.refresh(notification)
    return notification


async def list_user_notifications(
    db: AsyncSession,
    user_id: UUID,
    offset: int = 0,
    limit: int = 20,
    status_filter: NotificationStatus | None = None,
) -> tuple[list[Notification], int]:
    """List notifications for a user, deduplicating by event + message.

    When a user has multiple channels enabled (email + push), the Celery task
    creates one Notification row per channel.  The dropdown should only show
    one entry per logical notification, so we pick the most-recently-created
    row for each (user_id, event_id, message) group using PostgreSQL
    DISTINCT ON.
    """
    filters = [Notification.user_id == user_id]
    if status_filter:
        filters.append(Notification.status == status_filter)

    # ── Deduplicated list query ──────────────────────────────────
    # DISTINCT ON (event_id, message) keeps one row per logical notification,
    # ordered by created_at DESC so we get the newest one.
    dedup_query = (
        select(Notification)
        .where(*filters)
        .distinct(Notification.event_id, Notification.message)
        .order_by(
            Notification.event_id,
            Notification.message,
            Notification.created_at.desc(),
        )
    )

    # Wrap in a subquery so we can re-sort by created_at DESC for display
    # and apply offset/limit properly.
    dedup_sub = dedup_query.subquery()

    # Count deduplicated rows
    count_result = await db.execute(
        select(func.count()).select_from(dedup_sub)
    )
    total = count_result.scalar() or 0

    # Fetch page of deduplicated notifications
    result = await db.execute(
        select(Notification)
        .join(dedup_sub, Notification.id == dedup_sub.c.id)
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    notifications = list(result.scalars().all())
    return notifications, total


async def get_notification_by_id(
    db: AsyncSession, notification_id: UUID
) -> Notification | None:
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    return result.scalar_one_or_none()


async def mark_as_read(db: AsyncSession, notification: Notification) -> Notification:
    """Mark a notification and all its channel siblings as read.

    When a user has multiple channels, clicking a notification in the dropdown
    should also mark the sibling rows (same user + event + message) as read
    so the unread count stays consistent.
    """
    from sqlalchemy import update

    await db.execute(
        update(Notification)
        .where(
            and_(
                Notification.user_id == notification.user_id,
                Notification.event_id == notification.event_id,
                Notification.message == notification.message,
                Notification.status != NotificationStatus.READ,
            )
        )
        .values(status=NotificationStatus.READ)
    )
    await db.flush()
    await db.refresh(notification)
    return notification


async def mark_all_as_read(db: AsyncSession, user_id: UUID) -> int:
    """Mark all unread notifications for a user as read. Returns count updated."""
    from sqlalchemy import update

    result = await db.execute(
        update(Notification)
        .where(
            and_(
                Notification.user_id == user_id,
                Notification.status != NotificationStatus.READ,
            )
        )
        .values(status=NotificationStatus.READ)
    )
    await db.flush()
    return result.rowcount  # type: ignore[return-value]


async def save_push_subscription(
    db: AsyncSession, user: User, subscription_data: dict
) -> User:
    user.push_subscription = subscription_data
    await db.flush()
    await db.refresh(user)
    return user


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send an email notification. In dev mode, just log it."""
    if not settings.EMAIL_ENABLED:
        logger.info(f"[DEV EMAIL] To: {to_email}, Subject: {subject}, Body: {body}")
        return True

    try:
        import smtplib
        from email.mime.text import MIMEText

        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_push(subscription_info: dict, message: str) -> bool:
    """Send a web push notification."""
    try:
        from pywebpush import webpush

        webpush(
            subscription_info=subscription_info,
            data=json.dumps({"message": message}),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_CLAIMS_EMAIL},
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        return False


def get_channels_for_user(user: User) -> list[NotificationChannelType]:
    """Determine which notification channels to use based on the user's
    notification preferences (stored on the User model).

    Falls back to email-only if the user has no preferences set.
    """
    prefs = user.notification_preferences or {}
    channels: list[NotificationChannelType] = []

    if prefs.get("email", True):
        channels.append(NotificationChannelType.EMAIL)
    if prefs.get("push", False):
        channels.append(NotificationChannelType.PUSH)

    # Fallback: if the user somehow disabled everything, default to email
    if not channels:
        channels.append(NotificationChannelType.EMAIL)

    return channels
