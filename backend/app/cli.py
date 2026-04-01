"""CLI commands for the application."""
from __future__ import annotations

import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.models.user import User, UserRole
from app.models.event import Event  # noqa: F401 - needed for relationship resolution
from app.models.subscription import Subscription  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.organiser_request import OrganiserRequest  # noqa: F401
from app.utils.security import hash_password


async def seed_admin():
    """Create the first admin user from environment variables."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # Check if admin already exists
        result = await session.execute(
            select(User).where(User.email == settings.FIRST_ADMIN_EMAIL)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"Admin user {settings.FIRST_ADMIN_EMAIL} already exists.")
            if existing.role != UserRole.ADMIN:
                existing.role = UserRole.ADMIN
                await session.commit()
                print("Updated role to admin.")
            await engine.dispose()
            return

        admin = User(
            email=settings.FIRST_ADMIN_EMAIL,
            hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
            display_name="Admin",
            role=UserRole.ADMIN,
        )
        session.add(admin)
        await session.commit()
        print(f"Admin user created: {settings.FIRST_ADMIN_EMAIL}")

    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "seed-admin":
        asyncio.run(seed_admin())
    else:
        print("Usage: python -m app.cli seed-admin")
