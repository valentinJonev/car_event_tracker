from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.database import get_db
from app.models.organiser_request import OrgRequestStatus
from app.models.user import User, UserRole
from app.schemas.auth import UserListResponse, UserResponse
from app.schemas.organiser_request import (
    OrgRequestListResponse,
    OrgRequestResponse,
    OrgRequestReview,
)
from app.schemas.stats import FeaturedEventSettingResponse, SetFeaturedEventRequest
from app.services.event import get_event_by_id
from app.services.organiser_request import (
    get_request_by_id,
    list_pending_requests,
    review_request,
)
from app.services.stats import (
    clear_admin_featured_event,
    get_admin_featured_event_id,
    set_admin_featured_event,
)

router = APIRouter()


class UserRoleUpdateRequest(BaseModel):
    role: UserRole


# ── Organiser requests ───────────────────────────────────────────────


@router.get("/organiser-requests/", response_model=OrgRequestListResponse)
async def get_pending_organiser_requests(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    requests, total = await list_pending_requests(db)
    return OrgRequestListResponse(items=requests, total=total)


@router.put("/organiser-requests/{request_id}", response_model=OrgRequestResponse)
async def review_organiser_request(
    request_id: UUID,
    data: OrgRequestReview,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    if data.status not in (OrgRequestStatus.APPROVED, OrgRequestStatus.REJECTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'approved' or 'rejected'",
        )

    request = await get_request_by_id(db, request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organiser request not found",
        )

    if request.status != OrgRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request has already been reviewed",
        )

    reviewed = await review_request(db, request, data.status, current_user.id)
    return reviewed


@router.get("/users", response_model=UserListResponse)
async def list_users(
    search: str | None = Query(None, min_length=1, max_length=100),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    count_query = select(func.count(User.id))

    if search:
        pattern = f"%{search}%"
        filter_expr = or_(
            func.lower(User.display_name).like(func.lower(pattern)),
            func.lower(User.email).like(func.lower(pattern)),
        )
        query = query.where(filter_expr)
        count_query = count_query.where(filter_expr)

    users_result = await db.execute(query.order_by(User.created_at.desc()))
    users = list(users_result.scalars().all())

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    return UserListResponse(items=[UserResponse.model_validate(user) for user in users], total=total)


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: UUID,
    data: UserRoleUpdateRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.role = data.role
    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


# ── Featured event override ──────────────────────────────────────────


@router.get("/featured-event", response_model=FeaturedEventSettingResponse)
async def get_featured_event_override(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Get the current admin-overridden featured event (if any)."""
    event_id = await get_admin_featured_event_id(db)
    if event_id:
        return FeaturedEventSettingResponse(
            event_id=event_id,
            message="Featured event override is active.",
        )
    return FeaturedEventSettingResponse(
        event_id=None,
        message="No override set. Featured event is determined by most saves.",
    )


@router.put("/featured-event", response_model=FeaturedEventSettingResponse)
async def set_featured_event_override(
    data: SetFeaturedEventRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Set or update the admin-overridden featured event."""
    event = await get_event_by_id(db, data.event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )
    await set_admin_featured_event(db, data.event_id)
    return FeaturedEventSettingResponse(
        event_id=data.event_id,
        message="Featured event override set successfully.",
    )


@router.delete(
    "/featured-event",
    response_model=FeaturedEventSettingResponse,
)
async def clear_featured_event_override(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Remove the admin override so featured event falls back to most-saved."""
    await clear_admin_featured_event(db)
    return FeaturedEventSettingResponse(
        event_id=None,
        message="Featured event override cleared. Falling back to most saves.",
    )
