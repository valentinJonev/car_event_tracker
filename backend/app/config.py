from __future__ import annotations

import json
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/event_tracker"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@db:5432/event_tracker"
    TEST_DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@db:5432/event_tracker_test"
    )

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "change-me-to-a-random-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # First Admin
    FIRST_ADMIN_EMAIL: str = "admin@carevents.com"
    FIRST_ADMIN_PASSWORD: str = "admin123change-me"

    # OAuth2
    FACEBOOK_CLIENT_ID: str = "placeholder-facebook-client-id"
    FACEBOOK_CLIENT_SECRET: str = "placeholder-facebook-client-secret"
    INSTAGRAM_CLIENT_ID: str = "placeholder-instagram-client-id"
    INSTAGRAM_CLIENT_SECRET: str = "placeholder-instagram-client-secret"
    OAUTH_REDIRECT_BASE_URL: str = "http://localhost/api/v1/auth/oauth"

    # Email
    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "noreply@carevents.com"
    SMTP_PASSWORD: str = "placeholder-smtp-password"
    EMAIL_FROM: str = "noreply@carevents.com"
    EMAIL_ENABLED: bool = False

    # Web Push
    VAPID_PRIVATE_KEY: str = "placeholder-vapid-private-key"
    VAPID_PUBLIC_KEY: str = "placeholder-vapid-public-key"
    VAPID_CLAIMS_EMAIL: str = "mailto:admin@carevents.com"

    # CORS
    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost"]'

    # App
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_ENABLE_DOCS: bool = True
    APP_ALLOWED_HOSTS: str = '["*"]'

    @property
    def cors_origins_list(self) -> list[str]:
        return json.loads(self.CORS_ORIGINS)

    @property
    def allowed_hosts_list(self) -> list[str]:
        return json.loads(self.APP_ALLOWED_HOSTS)


@lru_cache
def get_settings() -> Settings:
    return Settings()
