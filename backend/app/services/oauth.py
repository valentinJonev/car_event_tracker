from __future__ import annotations

from typing import Any

from authlib.integrations.httpx_client import AsyncOAuth2Client
from fastapi import HTTPException, status

from app.config import get_settings

settings = get_settings()

OAUTH_PROVIDERS: dict[str, dict[str, Any]] = {
    "facebook": {
        "client_id": settings.FACEBOOK_CLIENT_ID,
        "client_secret": settings.FACEBOOK_CLIENT_SECRET,
        "authorize_url": "https://www.facebook.com/v18.0/dialog/oauth",
        "token_url": "https://graph.facebook.com/v18.0/oauth/access_token",
        "userinfo_url": "https://graph.facebook.com/me?fields=id,name,email,picture.type(large)",
        "scopes": "email,public_profile",
        "redirect_uri": f"{settings.OAUTH_REDIRECT_BASE_URL}/facebook/callback",
    },
    "instagram": {
        "client_id": settings.INSTAGRAM_CLIENT_ID,
        "client_secret": settings.INSTAGRAM_CLIENT_SECRET,
        "authorize_url": "https://api.instagram.com/oauth/authorize",
        "token_url": "https://api.instagram.com/oauth/access_token",
        "userinfo_url": "https://graph.instagram.com/me?fields=id,username",
        "scopes": "user_profile",
        "redirect_uri": f"{settings.OAUTH_REDIRECT_BASE_URL}/instagram/callback",
    },
}


def get_provider_config(provider: str) -> dict[str, Any]:
    if provider not in OAUTH_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}. Supported: {list(OAUTH_PROVIDERS.keys())}",
        )
    return OAUTH_PROVIDERS[provider]


def get_authorization_url(provider: str) -> str:
    config = get_provider_config(provider)
    client = AsyncOAuth2Client(
        client_id=config["client_id"],
        redirect_uri=config["redirect_uri"],
        scope=config["scopes"],
    )
    url, _ = client.create_authorization_url(config["authorize_url"])
    return url


async def exchange_code_for_user_info(
    provider: str, code: str
) -> dict[str, Any]:
    """Exchange OAuth authorization code for user information.

    Returns dict with keys: email, display_name, avatar_url, provider_id
    """
    config = get_provider_config(provider)

    async with AsyncOAuth2Client(
        client_id=config["client_id"],
        client_secret=config["client_secret"],
        redirect_uri=config["redirect_uri"],
    ) as client:
        token = await client.fetch_token(
            config["token_url"],
            code=code,
        )

        resp = await client.get(config["userinfo_url"])
        user_data = resp.json()

    if provider == "facebook":
        return {
            "email": user_data.get("email"),
            "display_name": user_data.get("name", "Facebook User"),
            "avatar_url": user_data.get("picture", {}).get("data", {}).get("url"),
            "provider_id": str(user_data.get("id")),
        }
    elif provider == "instagram":
        return {
            "email": None,  # Instagram basic display API doesn't provide email
            "display_name": user_data.get("username", "Instagram User"),
            "avatar_url": None,
            "provider_id": str(user_data.get("id")),
        }

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to parse user info from OAuth provider",
    )
