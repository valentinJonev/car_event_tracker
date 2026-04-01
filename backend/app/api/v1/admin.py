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
from app.services.organiser_request import (
    get_request_by_id,
    list_pending_requests,
    review_request,
)

router = APIRouter()


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
