import pytest
import uuid
from datetime import datetime, timezone, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event, EventStatus, EventType
from app.models.user import User
from tests.conftest import auth_headers


async def create_geo_event(
    db_session: AsyncSession,
    organiser: User,
    lat: float,
    lng: float,
    title: str = "Geo Event",
) -> Event:
    event = Event(
        id=uuid.uuid4(),
        title=title,
        event_type=EventType.RACING,
        status=EventStatus.PUBLISHED,
        start_datetime=datetime.now(timezone.utc) + timedelta(days=7),
        location_name="Test Location",
        latitude=lat,
        longitude=lng,
        location=f"SRID=4326;POINT({lng} {lat})",
        organiser_id=organiser.id,
    )
    db_session.add(event)
    await db_session.flush()
    return event


@pytest.mark.asyncio
class TestNearbyEvents:
    async def test_nearby_returns_events_within_radius(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_organiser: User,
    ):
        # Create event in Sofia (42.6977, 23.3219)
        await create_geo_event(
            db_session, test_organiser, 42.6977, 23.3219, "Sofia Event"
        )
        # Search near Sofia within 10km
        response = await client.get(
            "/api/v1/events/nearby?lat=42.6977&lng=23.3219&radius_km=10"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        titles = [e["title"] for e in data["items"]]
        assert "Sofia Event" in titles

    async def test_nearby_excludes_distant_events(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_organiser: User,
    ):
        # Create event in London (51.5074, -0.1278)
        await create_geo_event(
            db_session, test_organiser, 51.5074, -0.1278, "London Event"
        )
        # Search near Sofia within 10km - should not find London event
        response = await client.get(
            "/api/v1/events/nearby?lat=42.6977&lng=23.3219&radius_km=10"
        )
        assert response.status_code == 200
        data = response.json()
        titles = [e["title"] for e in data["items"]]
        assert "London Event" not in titles

    async def test_nearby_missing_params_returns_422(self, client: AsyncClient):
        response = await client.get("/api/v1/events/nearby")
        assert response.status_code == 422

    async def test_nearby_with_type_filter(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_organiser: User,
    ):
        await create_geo_event(
            db_session, test_organiser, 42.6977, 23.3219, "Racing Near"
        )
        response = await client.get(
            "/api/v1/events/nearby?lat=42.6977&lng=23.3219&radius_km=10&event_type=racing"
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["event_type"] == "racing"
