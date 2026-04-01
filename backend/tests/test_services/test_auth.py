import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.auth import authenticate_user, get_user_by_email
from app.models.user import User
from app.utils.security import hash_password


@pytest.mark.asyncio
class TestAuthService:
    async def test_get_user_by_email_found(
        self, db_session: AsyncSession, test_user: User
    ):
        user = await get_user_by_email(db_session, test_user.email)
        assert user is not None
        assert user.email == test_user.email

    async def test_get_user_by_email_not_found(self, db_session: AsyncSession):
        user = await get_user_by_email(db_session, "nonexistent@test.com")
        assert user is None

    async def test_authenticate_user_success(
        self, db_session: AsyncSession, test_user: User
    ):
        user = await authenticate_user(db_session, test_user.email, "testpass123")
        assert user is not None
        assert user.id == test_user.id

    async def test_authenticate_user_wrong_password(
        self, db_session: AsyncSession, test_user: User
    ):
        user = await authenticate_user(db_session, test_user.email, "wrongpass")
        assert user is None

    async def test_authenticate_user_nonexistent(self, db_session: AsyncSession):
        user = await authenticate_user(
            db_session, "nonexistent@test.com", "testpass123"
        )
        assert user is None
