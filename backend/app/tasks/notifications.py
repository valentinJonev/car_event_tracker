from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.celery_app import celery_app
from app.config import get_settings
from app.models.event import Event
from app.models.notification import (
    Notification,
    NotificationChannelType,
    NotificationStatus,
)
from app.models.user import User
from app.services.notification import (
    get_channels_for_user,
    send_email,
    send_push,
)
from app.services.subscription import find_matching_subscriptions

logger = logging.getLogger(__name__)
settings = get_settings()


async def _process_event_notifications(event_id: str, notification_type: str = "new"):
    """Async function to process notifications for an event.

    Args:
        event_id: The UUID of the event.
        notification_type: Either "new" (first publish) or "updated" (content change
            on an already-published event).
    """
    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with session_factory() as db:
        # Get the event
        result = await db.execute(select(Event).where(Event.id == UUID(event_id)))
        event = result.scalar_one_or_none()
        if not event:
            logger.error(f"Event {event_id} not found")
            return

        # Find matching subscriptions
        matching_subs = await find_matching_subscriptions(db, event)
        logger.info(
            f"Found {len(matching_subs)} matching subscriptions for event {event.title}"
        )

        # Deduplicate by user — a user may have multiple matching subscriptions
        # (e.g. subscribed to both the organiser AND the event type).
        # We only want to notify each user once, using their notification preferences.
        seen_user_ids: set[UUID] = set()

        # Fetch the organiser name once (same for all notifications of this event)
        organiser_result = await db.execute(
            select(User).where(User.id == event.organiser_id)
        )
        organiser = organiser_result.scalar_one_or_none()
        organiser_name = (
            organiser.display_name or organiser.email
            if organiser
            else "Unknown"
        )

        # Build the message based on notification type
        if notification_type == "updated":
            message = (
                f"{organiser_name} updated {event.title}\n"
                f"Type: {event.event_type.value}\n"
                f"Date: {event.start_datetime.strftime('%Y-%m-%d %H:%M')}\n"
                f"Location: {event.location_name}"
            )
            email_subject = f"Event Updated: {event.title}"
        else:
            message = (
                f"New event: {event.title}\n"
                f"Type: {event.event_type.value}\n"
                f"Date: {event.start_datetime.strftime('%Y-%m-%d %H:%M')}\n"
                f"Location: {event.location_name}"
            )
            email_subject = f"New Car Event: {event.title}"

        for sub in matching_subs:
            if sub.user_id in seen_user_ids:
                continue
            seen_user_ids.add(sub.user_id)

            # Get the user
            user_result = await db.execute(
                select(User).where(User.id == sub.user_id)
            )
            user = user_result.scalar_one_or_none()
            if not user:
                continue

            # Determine channels from user's notification preferences
            channels = get_channels_for_user(user)

            for channel in channels:
                # Create notification record
                notification = Notification(
                    user_id=user.id,
                    event_id=event.id,
                    channel=channel,
                    status=NotificationStatus.PENDING,
                    message=message,
                )
                db.add(notification)
                await db.flush()

                # Send notification
                success = False
                if channel == NotificationChannelType.EMAIL:
                    success = send_email(
                        to_email=user.email,
                        subject=email_subject,
                        body=message,
                    )
                elif channel == NotificationChannelType.PUSH:
                    if user.push_subscription:
                        success = send_push(user.push_subscription, message)
                    else:
                        logger.info(
                            f"User {user.id} has no push subscription, skipping push"
                        )
                        success = False

                # Update notification status
                notification.status = (
                    NotificationStatus.SENT if success else NotificationStatus.FAILED
                )
                if success:
                    notification.sent_at = datetime.now(timezone.utc)
                await db.flush()

        await db.commit()

    await engine.dispose()


@celery_app.task(name="send_event_notifications")
def send_event_notifications(event_id: str, notification_type: str = "new"):
    """Celery task to send notifications for an event.

    Args:
        event_id: The UUID of the event.
        notification_type: Either "new" (first publish) or "updated" (content change).
    """
    asyncio.run(_process_event_notifications(event_id, notification_type))
