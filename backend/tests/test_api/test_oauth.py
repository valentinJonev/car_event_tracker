import pytest
import uuid
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from tests.conftest import auth_headers


@pytest.mark.asyncio
class TestOAuthRedirect:
    async def test_facebook_redirect_returns_url(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/oauth/facebook")
        assert response.status_code == 200
        data = response.json()
        assert "authorization_url" in data
        assert "facebook.com" in data["authorization_url"]

    async def test_instagram_redirect_returns_url(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/oauth/instagram")
        assert response.status_code == 200
        data = response.json()
        assert "authorization_url" in data
        assert "instagram.com" in data["authorization_url"]

    async def test_invalid_provider_returns_400(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/oauth/invalid_provider")
        assert response.status_code == 400


@pytest.mark.asyncio
class TestOAuthCallback:
    @patch("app.api.v1.auth.exchange_code_for_user_info")
    async def test_callback_creates_new_user(
        self, mock_exchange, client: AsyncClient
    ):
        test_email = f"oauth_{uuid.uuid4().hex[:8]}@test.com"
        mock_exchange.return_value = {
            "email": test_email,
            "display_name": "OAuth User",
            "avatar_url": "https://example.com/avatar.jpg",
            "provider_id": "fb-12345",
        }

        response = await client.get(
            "/api/v1/auth/oauth/facebook/callback?code=test-code"
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @patch("app.api.v1.auth.exchange_code_for_user_info")
    async def test_callback_links_existing_user(
        self, mock_exchange, client: AsyncClient, test_user: User
    ):
        mock_exchange.return_value = {
            "email": test_user.email,
            "display_name": "OAuth User",
            "avatar_url": "https://example.com/avatar.jpg",
            "provider_id": "fb-67890",
        }

        response = await client.get(
            "/api/v1/auth/oauth/facebook/callback?code=test-code"
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    @patch("app.api.v1.auth.exchange_code_for_user_info")
    async def test_callback_no_email_returns_400(
        self, mock_exchange, client: AsyncClient
    ):
        mock_exchange.return_value = {
            "email": None,
            "display_name": "Instagram User",
            "avatar_url": None,
            "provider_id": "ig-12345",
        }

        response = await client.get(
            "/api/v1/auth/oauth/instagram/callback?code=test-code"
        )
        assert response.status_code == 400
