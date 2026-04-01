import pytest
import uuid
from datetime import datetime, timezone, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event, EventStatus, EventType
from app.models.user import User
from tests.conftest import auth_headers


def make_event_data(**overrides):
    base = {
        "title": f"Test Event {uuid.uuid4().hex[:8]}",
        "description": "A test car event",
        "event_type": "racing",
        "status": "published",
        "start_datetime": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "end_datetime": (datetime.now(timezone.utc) + timedelta(days=7, hours=6)).isoformat(),
        "location_name": "Test Track",
        "address": "123 Race St, Speed City",
        "latitude": 42.6977,
        "longitude": 23.3219,
    }
    base.update(overrides)
    return base


async def create_test_event(
    db_session: AsyncSession, organiser: User, **overrides
) -> Event:
    data = make_event_data(**overrides)
    event = Event(
        id=uuid.uuid4(),
        title=data["title"],
        description=data.get("description"),
        event_type=EventType(data["event_type"]),
        status=EventStatus(data.get("status", "published")),
        start_datetime=datetime.fromisoformat(data["start_datetime"]),
        end_datetime=datetime.fromisoformat(data["end_datetime"])
        if data.get("end_datetime")
        else None,
        location_name=data["location_name"],
        address=data.get("address"),
        latitude=data["latitude"],
        longitude=data["longitude"],
        location=f"SRID=4326;POINT({data['longitude']} {data['latitude']})",
        organiser_id=organiser.id,
    )
    db_session.add(event)
    await db_session.flush()
    return event


@pytest.mark.asyncio
class TestListEvents:
    async def test_list_events_empty(self, client: AsyncClient):
        response = await client.get("/api/v1/events/")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    async def test_list_events_returns_published(
        self, client: AsyncClient, db_session: AsyncSession, test_organiser: User
    ):
        await create_test_event(db_session, test_organiser, status="published")
        response = await client.get("/api/v1/events/")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    async def test_list_events_filter_by_type(
        self, client: AsyncClient, db_session: AsyncSession, test_organiser: User
    ):
        await create_test_event(db_session, test_organiser, event_type="drift")
        response = await client.get("/api/v1/events/?event_type=drift")
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["event_type"] == "drift"

    async def test_list_events_filter_by_status(
        self, client: AsyncClient, db_session: AsyncSession, test_organiser: User
    ):
        await create_test_event(db_session, test_organiser, status="draft")
        response = await client.get("/api/v1/events/?status=draft")
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "draft"

    async def test_list_events_excludes_cancelled_by_default(
        self, client: AsyncClient, db_session: AsyncSession, test_organiser: User
    ):
        event = await create_test_event(
            db_session, test_organiser, status="cancelled"
        )
        response = await client.get("/api/v1/events/")
        assert response.status_code == 200
        data = response.json()
        ids = [item["id"] for item in data["items"]]
        assert str(event.id) not in ids

    async def test_list_events_search(
        self, client: AsyncClient, db_session: AsyncSession, test_organiser: User
    ):
        unique_title = f"UniqueRace_{uuid.uuid4().hex[:8]}"
        await create_test_event(
            db_session, test_organiser, title=unique_title
        )
        response = await client.get(f"/api/v1/events/?search={unique_title}")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert unique_title in data["items"][0]["title"]


@pytest.mark.asyncio
class TestGetEvent:
    async def test_get_event_success(
        self, client: AsyncClient, db_session: AsyncSession, test_organiser: User
    ):
        event = await create_test_event(db_session, test_organiser)
        response = await client.get(f"/api/v1/events/{event.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == event.title

    async def test_get_event_not_found(self, client: AsyncClient):
        fake_id = uuid.uuid4()
        response = await client.get(f"/api/v1/events/{fake_id}")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestCreateEvent:
    async def test_create_event_organiser_success(
        self, client: AsyncClient, test_organiser: User
    ):
        response = await client.post(
            "/api/v1/events/",
            json=make_event_data(),
            headers=auth_headers(test_organiser),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["event_type"] == "racing"
        assert data["organiser_id"] == str(test_organiser.id)

    async def test_create_event_admin_success(
        self, client: AsyncClient, test_admin: User
    ):
        response = await client.post(
            "/api/v1/events/",
            json=make_event_data(),
            headers=auth_headers(test_admin),
        )
        assert response.status_code == 201

    async def test_create_event_user_forbidden(
        self, client: AsyncClient, test_user: User
    ):
        response = await client.post(
            "/api/v1/events/",
            json=make_event_data(),
            headers=auth_headers(test_user),
        )
        assert response.status_code == 403

    async def test_create_event_no_auth(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/events/", json=make_event_data()
        )
        assert response.status_code == 403

    async def test_create_event_missing_fields(
        self, client: AsyncClient, test_organiser: User
    ):
        response = await client.post(
            "/api/v1/events/",
            json={"title": "Incomplete"},
            headers=auth_headers(test_organiser),
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestUpdateEvent:
    async def test_update_event_owner_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_organiser: User,
    ):
        event = await create_test_event(db_session, test_organiser)
        response = await client.put(
            f"/api/v1/events/{event.id}",
            json={"title": "Updated Title"},
            headers=auth_headers(test_organiser),
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    async def test_update_event_admin_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_organiser: User,
        test_admin: User,
    ):
        event = await create_test_event(db_session, test_organiser)
        response = await client.put(
            f"/api/v1/events/{event.id}",
            json={"title": "Admin Updated"},
            headers=auth_headers(test_admin),
        )
        assert response.status_code == 200

    async def test_update_event_non_owner_forbidden(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_organiser: User,
        test_user: User,
    ):
        event = await create_test_event(db_session, test_organiser)
        response = await client.put(
            f"/api/v1/events/{event.id}",
            json={"title": "Unauthorized Update"},
            headers=auth_headers(test_user),
        )
        assert response.status_code == 403

    async def test_update_event_not_found(
        self, client: AsyncClient, test_organiser: User
    ):
        fake_id = uuid.uuid4()
        response = await client.put(
            f"/api/v1/events/{fake_id}",
            json={"title": "Not Found"},
            headers=auth_headers(test_organiser),
        )
        assert response.status_code == 404


@pytest.mark.asyncio
class TestDeleteEvent:
    async def test_delete_event_owner_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_organiser: User,
    ):
        event = await create_test_event(db_session, test_organiser)
        response = await client.delete(
            f"/api/v1/events/{event.id}",
            headers=auth_headers(test_organiser),
        )
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"

    async def test_delete_event_non_owner_forbidden(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_organiser: User,
        test_user: User,
    ):
        event = await create_test_event(db_session, test_organiser)
        response = await client.delete(
            f"/api/v1/events/{event.id}",
            headers=auth_headers(test_user),
        )
        assert response.status_code == 403

    async def test_delete_event_no_auth(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_organiser: User,
    ):
        event = await create_test_event(db_session, test_organiser)
        response = await client.delete(f"/api/v1/events/{event.id}")
        assert response.status_code == 403
