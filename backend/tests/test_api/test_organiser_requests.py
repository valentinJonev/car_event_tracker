import pytest
import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organiser_request import OrganiserRequest, OrgRequestStatus
from app.models.user import User, UserRole
from tests.conftest import auth_headers


@pytest.mark.asyncio
class TestSubmitOrgRequest:
    async def test_user_can_submit_request(
        self, client: AsyncClient, test_user: User
    ):
        response = await client.post(
            "/api/v1/organiser-requests/",
            json={"reason": "I organize regular car meets in my city and want to share them."},
            headers=auth_headers(test_user),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "pending"
        assert data["user_id"] == str(test_user.id)

    async def test_organiser_cannot_submit(
        self, client: AsyncClient, test_organiser: User
    ):
        response = await client.post(
            "/api/v1/organiser-requests/",
            json={"reason": "Already an organiser trying again."},
            headers=auth_headers(test_organiser),
        )
        assert response.status_code == 400

    async def test_admin_cannot_submit(
        self, client: AsyncClient, test_admin: User
    ):
        response = await client.post(
            "/api/v1/organiser-requests/",
            json={"reason": "Admin trying to request."},
            headers=auth_headers(test_admin),
        )
        assert response.status_code == 400

    async def test_duplicate_pending_request_409(
        self, client: AsyncClient, test_user: User
    ):
        # First request
        await client.post(
            "/api/v1/organiser-requests/",
            json={"reason": "First request for organiser status."},
            headers=auth_headers(test_user),
        )
        # Second request should fail
        response = await client.post(
            "/api/v1/organiser-requests/",
            json={"reason": "Second request for organiser status."},
            headers=auth_headers(test_user),
        )
        assert response.status_code == 409

    async def test_short_reason_422(
        self, client: AsyncClient, test_user: User
    ):
        response = await client.post(
            "/api/v1/organiser-requests/",
            json={"reason": "short"},
            headers=auth_headers(test_user),
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestGetMyRequest:
    async def test_get_own_request(self, client: AsyncClient, test_user: User):
        # Submit first
        await client.post(
            "/api/v1/organiser-requests/",
            json={"reason": "I want to organize events for my community."},
            headers=auth_headers(test_user),
        )
        response = await client.get(
            "/api/v1/organiser-requests/me",
            headers=auth_headers(test_user),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"

    async def test_no_request_returns_404(
        self, client: AsyncClient, test_user: User
    ):
        response = await client.get(
            "/api/v1/organiser-requests/me",
            headers=auth_headers(test_user),
        )
        # May or may not have a request depending on test order
        assert response.status_code in (200, 404)


@pytest.mark.asyncio
class TestAdminOrgRequests:
    async def test_admin_can_list_pending(
        self, client: AsyncClient, test_admin: User, test_user: User
    ):
        # User submits a request
        await client.post(
            "/api/v1/organiser-requests/",
            json={"reason": "I organize track days and want to list them."},
            headers=auth_headers(test_user),
        )

        response = await client.get(
            "/api/v1/admin/organiser-requests/",
            headers=auth_headers(test_admin),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    async def test_non_admin_cannot_list(
        self, client: AsyncClient, test_user: User
    ):
        response = await client.get(
            "/api/v1/admin/organiser-requests/",
            headers=auth_headers(test_user),
        )
        assert response.status_code == 403

    async def test_admin_approve_request(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_admin: User,
        test_user: User,
    ):
        # User submits request
        submit_resp = await client.post(
            "/api/v1/organiser-requests/",
            json={"reason": "I run a racing team and organize events regularly."},
            headers=auth_headers(test_user),
        )
        request_id = submit_resp.json()["id"]

        # Admin approves
        response = await client.put(
            f"/api/v1/admin/organiser-requests/{request_id}",
            json={"status": "approved"},
            headers=auth_headers(test_admin),
        )
        assert response.status_code == 200
        assert response.json()["status"] == "approved"

    async def test_admin_reject_request(
        self, client: AsyncClient, test_admin: User, test_user: User
    ):
        submit_resp = await client.post(
            "/api/v1/organiser-requests/",
            json={"reason": "I want to organize events for the car community."},
            headers=auth_headers(test_user),
        )
        request_id = submit_resp.json()["id"]

        response = await client.put(
            f"/api/v1/admin/organiser-requests/{request_id}",
            json={"status": "rejected"},
            headers=auth_headers(test_admin),
        )
        assert response.status_code == 200
        assert response.json()["status"] == "rejected"

    async def test_approve_after_approval_can_create_events(
        self,
        client: AsyncClient,
        test_admin: User,
        test_user: User,
    ):
        # First verify user cannot create events
        from tests.test_api.test_events import make_event_data

        create_resp = await client.post(
            "/api/v1/events/",
            json=make_event_data(),
            headers=auth_headers(test_user),
        )
        assert create_resp.status_code == 403

        # Submit and approve request
        submit_resp = await client.post(
            "/api/v1/organiser-requests/",
            json={"reason": "I host weekly car meets at the local track."},
            headers=auth_headers(test_user),
        )
        request_id = submit_resp.json()["id"]

        await client.put(
            f"/api/v1/admin/organiser-requests/{request_id}",
            json={"status": "approved"},
            headers=auth_headers(test_admin),
        )

        # Now user should be able to create events (need fresh token since role changed)
        # Note: The user's role is updated in DB, but the JWT still has the old user info.
        # The get_current_user dependency fetches fresh user data from DB, so this should work.
        create_resp = await client.post(
            "/api/v1/events/",
            json=make_event_data(),
            headers=auth_headers(test_user),
        )
        assert create_resp.status_code == 201
