import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.utils.security import create_access_token, create_refresh_token
from tests.conftest import auth_headers

import uuid
from datetime import timedelta


@pytest.mark.asyncio
class TestRegister:
    async def test_register_success(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": f"new_{uuid.uuid4().hex[:8]}@test.com",
                "password": "testpass123",
                "display_name": "New User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"].endswith("@test.com")
        assert data["display_name"] == "New User"
        assert data["role"] == "user"
        assert "hashed_password" not in data

    async def test_register_duplicate_email(
        self, client: AsyncClient, test_user: User
    ):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": test_user.email,
                "password": "testpass123",
                "display_name": "Another User",
            },
        )
        assert response.status_code == 409

    async def test_register_invalid_email(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "testpass123",
                "display_name": "Bad Email User",
            },
        )
        assert response.status_code == 422

    async def test_register_short_password(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": f"short_{uuid.uuid4().hex[:8]}@test.com",
                "password": "short",
                "display_name": "Short Pass User",
            },
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestLogin:
    async def test_login_success(self, client: AsyncClient, test_user: User):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": test_user.email, "password": "testpass123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": test_user.email, "password": "wrongpassword"},
        )
        assert response.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@test.com", "password": "testpass123"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestRefresh:
    async def test_refresh_success(self, client: AsyncClient, test_user: User):
        refresh_token = create_refresh_token(data={"sub": str(test_user.id)})
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_refresh_with_access_token_fails(
        self, client: AsyncClient, test_user: User
    ):
        # Using an access token instead of refresh should fail
        access_token = create_access_token(data={"sub": str(test_user.id)})
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": access_token},
        )
        assert response.status_code == 401

    async def test_refresh_with_expired_token(
        self, client: AsyncClient, test_user: User
    ):
        expired_token = create_refresh_token(
            data={"sub": str(test_user.id)}, expires_delta=timedelta(seconds=-1)
        )
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": expired_token},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestMe:
    async def test_get_me_success(self, client: AsyncClient, test_user: User):
        response = await client.get(
            "/api/v1/auth/me", headers=auth_headers(test_user)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["display_name"] == test_user.display_name
        assert data["role"] == "user"

    async def test_get_me_without_token(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 403  # HTTPBearer returns 403 when no credentials

    async def test_get_me_with_expired_token(
        self, client: AsyncClient, test_user: User
    ):
        expired_token = create_access_token(
            data={"sub": str(test_user.id)}, expires_delta=timedelta(seconds=-1)
        )
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401
