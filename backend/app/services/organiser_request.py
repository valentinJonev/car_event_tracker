from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organiser_request import OrgRequestStatus, OrganiserRequest
from app.models.user import User, UserRole


async def create_organiser_request(
    db: AsyncSession, user_id: UUID, reason: str
) -> OrganiserRequest:
    request = OrganiserRequest(
        user_id=user_id,
        reason=reason,
        status=OrgRequestStatus.PENDING,
    )
    db.add(request)
    await db.flush()
    await db.refresh(request)
    return request


async def get_pending_request_for_user(
    db: AsyncSession, user_id: UUID
) -> OrganiserRequest | None:
    result = await db.execute(
        select(OrganiserRequest).where(
            and_(
                OrganiserRequest.user_id == user_id,
                OrganiserRequest.status == OrgRequestStatus.PENDING,
            )
        )
    )
    return result.scalar_one_or_none()


async def get_latest_request_for_user(
    db: AsyncSession, user_id: UUID
) -> OrganiserRequest | None:
    result = await db.execute(
        select(OrganiserRequest)
        .where(OrganiserRequest.user_id == user_id)
        .order_by(OrganiserRequest.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_request_by_id(
    db: AsyncSession, request_id: UUID
) -> OrganiserRequest | None:
    result = await db.execute(
        select(OrganiserRequest).where(OrganiserRequest.id == request_id)
    )
    return result.scalar_one_or_none()


async def list_pending_requests(
    db: AsyncSession,
) -> tuple[list[OrganiserRequest], int]:
    count_result = await db.execute(
        select(func.count(OrganiserRequest.id)).where(
            OrganiserRequest.status == OrgRequestStatus.PENDING
        )
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(OrganiserRequest)
        .where(OrganiserRequest.status == OrgRequestStatus.PENDING)
        .order_by(OrganiserRequest.created_at.asc())
    )
    requests = list(result.scalars().all())

    return requests, total


async def review_request(
    db: AsyncSession,
    request: OrganiserRequest,
    new_status: OrgRequestStatus,
    reviewer_id: UUID,
) -> OrganiserRequest:
    request.status = new_status
    request.reviewed_by = reviewer_id
    request.reviewed_at = datetime.now(timezone.utc)
    await db.flush()

    # If approved, update user role
    if new_status == OrgRequestStatus.APPROVED:
        result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            user.role = UserRole.ORGANISER
            await db.flush()

    await db.refresh(request)
    return request
