from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.organiser_request import OrgRequestStatus


class OrgRequestCreate(BaseModel):
    reason: str = Field(..., min_length=10, max_length=2000)


class OrgRequestUserResponse(BaseModel):
    id: UUID
    display_name: str
    email: str
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class OrgRequestResponse(BaseModel):
    id: UUID
    user_id: UUID
    user: Optional[OrgRequestUserResponse] = None
    status: OrgRequestStatus
    reason: str
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrgRequestReview(BaseModel):
    status: OrgRequestStatus = Field(
        ..., description="Must be 'approved' or 'rejected'"
    )


class OrgRequestListResponse(BaseModel):
    items: list[OrgRequestResponse]
    total: int
