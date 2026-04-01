from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.organiser_request import OrgRequestCreate, OrgRequestResponse
from app.services.organiser_request import (
    create_organiser_request,
    get_latest_request_for_user,
    get_pending_request_for_user,
)

router = APIRouter()


@router.post("/", response_model=OrgRequestResponse, status_code=status.HTTP_201_CREATED)
async def submit_organiser_request(
    data: OrgRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Only regular users can request
    if current_user.role != UserRole.USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only users with 'user' role can request organiser status",
        )

    # Check for existing pending request
    existing = await get_pending_request_for_user(db, current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a pending organiser request",
        )

    request = await create_organiser_request(db, current_user.id, data.reason)
    return request


@router.get("/me", response_model=OrgRequestResponse)
async def get_my_request(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    request = await get_latest_request_for_user(db, current_user.id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organiser request found",
        )
    return request
