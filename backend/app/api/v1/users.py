from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.models.user import User, UserRole
from app.models.event import Event, EventStatus

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────


class OrganiserItem(BaseModel):
    id: UUID
    display_name: str
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class OrganiserListResponse(BaseModel):
    items: list[OrganiserItem]


class OrganiserDetailResponse(BaseModel):
    id: UUID
    display_name: str
    avatar_url: Optional[str] = None
    social_links: Optional[dict] = None
    created_at: datetime
    event_count: int
    upcoming_event_count: int

    model_config = {"from_attributes": True}


class OrganiserPageItem(BaseModel):
    id: UUID
    display_name: str
    avatar_url: Optional[str] = None
    event_count: int
    upcoming_event_count: int

    model_config = {"from_attributes": True}


class OrganiserPageResponse(BaseModel):
    items: list[OrganiserPageItem]
    total: int
    offset: int
    limit: int


# ── Endpoints ────────────────────────────────────────────────────────────


@router.get("/organisers", response_model=OrganiserListResponse)
async def search_organisers(
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Search users with organiser or admin role by display name.

    This is a lightweight endpoint used for filter autocomplete.
    """
    query = select(User).where(
        User.role.in_([UserRole.ORGANISER, UserRole.ADMIN]),
        User.is_active == True,  # noqa: E712
    )

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                func.lower(User.display_name).like(func.lower(pattern)),
                func.lower(User.email).like(func.lower(pattern)),
            )
        )

    query = query.order_by(User.display_name.asc()).limit(limit)
    result = await db.execute(query)
    users = list(result.scalars().all())

    return OrganiserListResponse(items=users)


@router.get("/organisers/browse", response_model=OrganiserPageResponse)
async def browse_organisers(
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    offset: int = Query(0, ge=0),
    limit: int = Query(12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Browse organisers with pagination and search. Returns event counts.

    This powers the Organisers listing page.
    """
    now = datetime.utcnow()

    base_filter = and_(
        User.role.in_([UserRole.ORGANISER, UserRole.ADMIN]),
        User.is_active == True,  # noqa: E712
    )

    search_filter = None
    if search:
        pattern = f"%{search}%"
        search_filter = or_(
            func.lower(User.display_name).like(func.lower(pattern)),
            func.lower(User.email).like(func.lower(pattern)),
        )

    # Subquery for total published event count per organiser
    event_count_sub = (
        select(
            Event.organiser_id,
            func.count(Event.id).label("event_count"),
        )
        .where(Event.status.in_([EventStatus.PUBLISHED, EventStatus.COMPLETED]))
        .group_by(Event.organiser_id)
        .subquery()
    )

    # Subquery for upcoming event count per organiser
    upcoming_count_sub = (
        select(
            Event.organiser_id,
            func.count(Event.id).label("upcoming_event_count"),
        )
        .where(
            and_(
                Event.status == EventStatus.PUBLISHED,
                Event.start_datetime >= now,
            )
        )
        .group_by(Event.organiser_id)
        .subquery()
    )

    # Count total matching organisers
    count_filters = [base_filter]
    if search_filter is not None:
        count_filters.append(search_filter)

    count_result = await db.execute(
        select(func.count(User.id)).where(and_(*count_filters))
    )
    total = count_result.scalar() or 0

    # Main query joining event counts
    query = (
        select(
            User.id,
            User.display_name,
            User.avatar_url,
            func.coalesce(event_count_sub.c.event_count, 0).label("event_count"),
            func.coalesce(upcoming_count_sub.c.upcoming_event_count, 0).label(
                "upcoming_event_count"
            ),
        )
        .outerjoin(event_count_sub, User.id == event_count_sub.c.organiser_id)
        .outerjoin(upcoming_count_sub, User.id == upcoming_count_sub.c.organiser_id)
        .where(base_filter)
    )

    if search_filter is not None:
        query = query.where(search_filter)

    query = query.order_by(User.display_name.asc()).offset(offset).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    items = [
        OrganiserPageItem(
            id=row.id,
            display_name=row.display_name,
            avatar_url=row.avatar_url,
            event_count=row.event_count,
            upcoming_event_count=row.upcoming_event_count,
        )
        for row in rows
    ]

    return OrganiserPageResponse(
        items=items,
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/organisers/{organiser_id}", response_model=OrganiserDetailResponse)
async def get_organiser_detail(
    organiser_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get organiser public profile with event counts."""
    now = datetime.utcnow()

    result = await db.execute(
        select(User).where(
            User.id == organiser_id,
            User.role.in_([UserRole.ORGANISER, UserRole.ADMIN]),
            User.is_active == True,  # noqa: E712
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Organiser not found")

    # Count published/completed events
    event_count_result = await db.execute(
        select(func.count(Event.id)).where(
            Event.organiser_id == organiser_id,
            Event.status.in_([EventStatus.PUBLISHED, EventStatus.COMPLETED]),
        )
    )
    event_count = event_count_result.scalar() or 0

    # Count upcoming events
    upcoming_count_result = await db.execute(
        select(func.count(Event.id)).where(
            Event.organiser_id == organiser_id,
            Event.status == EventStatus.PUBLISHED,
            Event.start_datetime >= now,
        )
    )
    upcoming_event_count = upcoming_count_result.scalar() or 0

    return OrganiserDetailResponse(
        id=user.id,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        social_links=user.social_links,
        created_at=user.created_at,
        event_count=event_count,
        upcoming_event_count=upcoming_event_count,
    )
