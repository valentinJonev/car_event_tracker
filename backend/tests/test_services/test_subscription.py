import pytest
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event, EventStatus, EventType
from app.models.subscription import FilterType, Subscription
from app.models.user import User
from app.services.subscription import find_matching_subscriptions


async def _create_sub(db: AsyncSession, user: User, **kwargs) -> Subscription:
    sub = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        filter_type=kwargs.get("filter_type", FilterType.EVENT_TYPE),
        filter_value=kwargs.get("filter_value", "racing"),
        filter_meta=kwargs.get("filter_meta"),
    )
    db.add(sub)
    await db.flush()
    return sub


async def _create_event(db: AsyncSession, organiser: User, **kwargs) -> Event:
    event = Event(
        id=uuid.uuid4(),
        title=kwargs.get("title", "Test Event"),
        event_type=kwargs.get("event_type", EventType.RACING),
        status=EventStatus.PUBLISHED,
        start_datetime=datetime.now(timezone.utc) + timedelta(days=7),
        location_name="Test Track",
        latitude=kwargs.get("latitude", 42.6977),
        longitude=kwargs.get("longitude", 23.3219),
        location=f"SRID=4326;POINT({kwargs.get('longitude', 23.3219)} {kwargs.get('latitude', 42.6977)})",
        organiser_id=organiser.id,
    )
    db.add(event)
    await db.flush()
    return event


@pytest.mark.asyncio
class TestSubscriptionMatching:
    async def test_match_by_organiser(
        self, db_session: AsyncSession, test_user: User, test_organiser: User
    ):
        await _create_sub(
            db_session,
            test_user,
            filter_type=FilterType.ORGANISER,
            filter_value=str(test_organiser.id),
        )
        event = await _create_event(db_session, test_organiser)
        matches = await find_matching_subscriptions(db_session, event)
        assert len(matches) >= 1
        assert any(s.filter_type == FilterType.ORGANISER for s in matches)

    async def test_match_by_event_type(
        self, db_session: AsyncSession, test_user: User, test_organiser: User
    ):
        await _create_sub(
            db_session,
            test_user,
            filter_type=FilterType.EVENT_TYPE,
            filter_value="racing",
        )
        event = await _create_event(
            db_session, test_organiser, event_type=EventType.RACING
        )
        matches = await find_matching_subscriptions(db_session, event)
        assert len(matches) >= 1

    async def test_no_match_different_type(
        self, db_session: AsyncSession, test_user: User, test_organiser: User
    ):
        await _create_sub(
            db_session,
            test_user,
            filter_type=FilterType.EVENT_TYPE,
            filter_value="drift",
        )
        event = await _create_event(
            db_session, test_organiser, event_type=EventType.RACING
        )
        matches = await find_matching_subscriptions(db_session, event)
        # Should not match drift subscription to racing event
        drift_matches = [
            s
            for s in matches
            if s.filter_type == FilterType.EVENT_TYPE and s.filter_value == "drift"
        ]
        assert len(drift_matches) == 0

    async def test_match_by_location(
        self, db_session: AsyncSession, test_user: User, test_organiser: User
    ):
        # Subscription for Sofia area
        await _create_sub(
            db_session,
            test_user,
            filter_type=FilterType.LOCATION,
            filter_value="42.6977,23.3219",
            filter_meta={"radius_km": 50},
        )
        # Event near Sofia
        event = await _create_event(
            db_session,
            test_organiser,
            latitude=42.7000,
            longitude=23.3300,
        )
        matches = await find_matching_subscriptions(db_session, event)
        location_matches = [
            s for s in matches if s.filter_type == FilterType.LOCATION
        ]
        assert len(location_matches) >= 1
