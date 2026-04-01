import pytest
import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from tests.conftest import auth_headers


@pytest.mark.asyncio
class TestListSubscriptions:
    async def test_list_own_subscriptions_empty(
        self, client: AsyncClient, test_user: User
    ):
        response = await client.get(
            "/api/v1/subscriptions/",
            headers=auth_headers(test_user),
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["items"], list)

    async def test_list_returns_only_own(
        self, client: AsyncClient, test_user: User, test_organiser: User
    ):
        # Create sub for test_user
        await client.post(
            "/api/v1/subscriptions/",
            json={
                "filter_type": "event_type",
                "filter_value": "racing",
            },
            headers=auth_headers(test_user),
        )
        # Create sub for organiser
        await client.post(
            "/api/v1/subscriptions/",
            json={
                "filter_type": "event_type",
                "filter_value": "drift",
            },
            headers=auth_headers(test_organiser),
        )

        # test_user should only see their own
        response = await client.get(
            "/api/v1/subscriptions/",
            headers=auth_headers(test_user),
        )
        data = response.json()
        for item in data["items"]:
            assert item["user_id"] == str(test_user.id)

    async def test_no_auth_returns_403(self, client: AsyncClient):
        response = await client.get("/api/v1/subscriptions/")
        assert response.status_code == 403


@pytest.mark.asyncio
class TestCreateSubscription:
    async def test_create_event_type_subscription(
        self, client: AsyncClient, test_user: User
    ):
        response = await client.post(
            "/api/v1/subscriptions/",
            json={
                "filter_type": "event_type",
                "filter_value": "racing",
            },
            headers=auth_headers(test_user),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["filter_type"] == "event_type"
        assert data["filter_value"] == "racing"

    async def test_create_organiser_subscription(
        self, client: AsyncClient, test_user: User, test_organiser: User
    ):
        response = await client.post(
            "/api/v1/subscriptions/",
            json={
                "filter_type": "organiser",
                "filter_value": str(test_organiser.id),
            },
            headers=auth_headers(test_user),
        )
        assert response.status_code == 201

    async def test_create_location_subscription(
        self, client: AsyncClient, test_user: User
    ):
        response = await client.post(
            "/api/v1/subscriptions/",
            json={
                "filter_type": "location",
                "filter_value": "42.6977,23.3219",
                "filter_meta": {"radius_km": 50},
            },
            headers=auth_headers(test_user),
        )
        assert response.status_code == 201

    async def test_create_invalid_filter_type(
        self, client: AsyncClient, test_user: User
    ):
        response = await client.post(
            "/api/v1/subscriptions/",
            json={
                "filter_type": "invalid",
                "filter_value": "test",
            },
            headers=auth_headers(test_user),
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestDeleteSubscription:
    async def test_delete_own_subscription(
        self, client: AsyncClient, test_user: User
    ):
        # Create
        create_resp = await client.post(
            "/api/v1/subscriptions/",
            json={
                "filter_type": "event_type",
                "filter_value": "drift",
            },
            headers=auth_headers(test_user),
        )
        sub_id = create_resp.json()["id"]

        # Delete
        response = await client.delete(
            f"/api/v1/subscriptions/{sub_id}",
            headers=auth_headers(test_user),
        )
        assert response.status_code == 204

    async def test_delete_other_users_subscription_forbidden(
        self, client: AsyncClient, test_user: User, test_organiser: User
    ):
        # Create sub as organiser
        create_resp = await client.post(
            "/api/v1/subscriptions/",
            json={
                "filter_type": "event_type",
                "filter_value": "racing",
            },
            headers=auth_headers(test_organiser),
        )
        sub_id = create_resp.json()["id"]

        # Try to delete as test_user
        response = await client.delete(
            f"/api/v1/subscriptions/{sub_id}",
            headers=auth_headers(test_user),
        )
        assert response.status_code == 403

    async def test_delete_nonexistent_returns_404(
        self, client: AsyncClient, test_user: User
    ):
        fake_id = uuid.uuid4()
        response = await client.delete(
            f"/api/v1/subscriptions/{fake_id}",
            headers=auth_headers(test_user),
        )
        assert response.status_code == 404
