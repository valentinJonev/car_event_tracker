from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.subscription import FilterType


class SubscriptionCreate(BaseModel):
    filter_type: FilterType
    filter_value: str = Field(..., min_length=1, max_length=500)
    filter_meta: Optional[dict] = None  # e.g. {"radius_km": 50} for location filters


class SubscriptionResponse(BaseModel):
    id: UUID
    user_id: UUID
    filter_type: FilterType
    filter_value: str
    filter_meta: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionListResponse(BaseModel):
    items: list[SubscriptionResponse]
    total: int
