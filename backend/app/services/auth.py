from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.schemas.auth import RegisterRequest, UserUpdate
from app.utils.security import hash_password, verify_password


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, data: RegisterRequest) -> User:
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        display_name=data.display_name,
        role=UserRole.USER,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def update_user(db: AsyncSession, user: User, data: UserUpdate) -> User:
    """Update user profile fields. Password change requires current_password verification."""
    # Handle password change
    if data.new_password is not None:
        if data.current_password is None:
            raise ValueError("Current password is required to set a new password")
        if user.hashed_password is None:
            raise ValueError(
                "Cannot change password for OAuth-only accounts without a password set"
            )
        if not verify_password(data.current_password, user.hashed_password):
            raise ValueError("Current password is incorrect")
        user.hashed_password = hash_password(data.new_password)

    # Update simple fields
    if data.display_name is not None:
        user.display_name = data.display_name
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url

    # Update JSON fields
    if data.social_links is not None:
        user.social_links = data.social_links.model_dump()
    if data.notification_preferences is not None:
        user.notification_preferences = data.notification_preferences.model_dump()

    await db.flush()
    await db.refresh(user)
    return user


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User | None:
    user = await get_user_by_email(db, email)
    if user is None:
        return None
    if user.hashed_password is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def create_or_get_oauth_user(
    db: AsyncSession,
    email: str,
    display_name: str,
    avatar_url: str | None,
    oauth_provider: str,
    oauth_provider_id: str,
) -> User:
    # Check if user exists with this OAuth provider + ID
    result = await db.execute(
        select(User).where(
            User.oauth_provider == oauth_provider,
            User.oauth_provider_id == oauth_provider_id,
        )
    )
    user = result.scalar_one_or_none()
    if user:
        return user

    # Check if user exists with same email - link account
    user = await get_user_by_email(db, email)
    if user:
        user.oauth_provider = oauth_provider
        user.oauth_provider_id = oauth_provider_id
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        await db.flush()
        await db.refresh(user)
        return user

    # Create new user
    user = User(
        email=email,
        display_name=display_name,
        avatar_url=avatar_url,
        oauth_provider=oauth_provider,
        oauth_provider_id=oauth_provider_id,
        role=UserRole.USER,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user
