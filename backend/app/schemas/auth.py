from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class SocialLinks(BaseModel):
    facebook: Optional[str] = None
    instagram: Optional[str] = None


class NotificationPreferences(BaseModel):
    email: bool = True
    push: bool = True


class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    role: str
    oauth_provider: Optional[str] = None
    social_links: Optional[dict] = None
    notification_preferences: Optional[dict] = None
    is_active: bool
    calendar_feed_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    social_links: Optional[SocialLinks] = None
    notification_preferences: Optional[NotificationPreferences] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(None, min_length=8, max_length=128)
