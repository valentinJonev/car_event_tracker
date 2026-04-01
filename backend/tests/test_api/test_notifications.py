import pytest
import uuid
from datetime import datetime, timezone, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event, EventStatus, EventType
from app.models.notification import Notification, NotificationChannelType, NotificationStatus
from app.models.user import User
from tests.conftest import auth_headers


async def _create_notification(
    db_session: AsyncSession, user: User, event: Event, **kwargs
) -> Notification:
    notif = Notification(
        id=uuid.uuid4(),
        user_id=user.id,
        event_id=event.id,
        channel=kwargs.get("channel", NotificationChannelType.EMAIL),
        status=kwargs.get("status", NotificationStatus.SENT),
        message=kwargs.get("message", "Test notification"),
    )
    db_session.add(notif)
    await db_session.flush()
    return notif


async def _create_test_event(db_session: AsyncSession, organiser: User) -> Event:
    event = Event(
        id=uuid.uuid4(),
        title="Notification Test Event",
        event_type=EventType.RACING,
        status=EventStatus.PUBLISHED,
        start_datetime=datetime.now(timezone.utc) + timedelta(days=7),
        location_name="Test Track",
        latitude=42.6977,
        longitude=23.3219,
        location=f"SRID=4326;POINT(23.3219 42.6977)",
        organiser_id=organiser.id,
    )
    db_session.add(event)
    await db_session.flush()
    return event


@pytest.mark.asyncio
class TestListNotifications:
    async def test_list_own_notifications(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        test_organiser: User,
    ):
        event = await _create_test_event(db_session, test_organiser)
        await _create_notification(db_session, test_user, event)

        response = await client.get(
            "/api/v1/notifications/",
            headers=auth_headers(test_user),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["user_id"] == str(test_user.id)

    async def test_list_paginated(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        test_organiser: User,
    ):
        event = await _create_test_event(db_session, test_organiser)
        for _ in range(3):
            await _create_notification(db_session, test_user, event)

        response = await client.get(
            "/api/v1/notifications/?limit=2",
            headers=auth_headers(test_user),
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 2

    async def test_no_auth_returns_403(self, client: AsyncClient):
        response = await client.get("/api/v1/notifications/")
        assert response.status_code == 403


@pytest.mark.asyncio
class TestMarkAsRead:
    async def test_mark_as_read_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        test_organiser: User,
    ):
        event = await _create_test_event(db_session, test_organiser)
        notif = await _create_notification(
            db_session, test_user, event, status=NotificationStatus.SENT
        )

        response = await client.put(
            f"/api/v1/notifications/{notif.id}/read",
            headers=auth_headers(test_user),
        )
        assert response.status_code == 200
        assert response.json()["status"] == "read"

    async def test_mark_other_users_notification_forbidden(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        test_organiser: User,
    ):
        event = await _create_test_event(db_session, test_organiser)
        notif = await _create_notification(db_session, test_organiser, event)

        response = await client.put(
            f"/api/v1/notifications/{notif.id}/read",
            headers=auth_headers(test_user),
        )
        assert response.status_code == 403


@pytest.mark.asyncio
class TestPushSubscribe:
    async def test_register_push_subscription(
        self, client: AsyncClient, test_user: User
    ):
        response = await client.post(
            "/api/v1/notifications/push/subscribe",
            json={
                "subscription": {
                    "endpoint": "https://push.example.com/sub123",
                    "keys": {"p256dh": "test-key", "auth": "test-auth"},
                }
            },
            headers=auth_headers(test_user),
        )
        assert response.status_code == 200
