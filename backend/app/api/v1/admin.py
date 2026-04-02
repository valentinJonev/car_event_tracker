from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.database import get_db
from app.models.organiser_request import OrgRequestStatus
from app.models.user import User, UserRole
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
