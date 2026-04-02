from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.stats import FeaturedEventResponse, PlatformStatsResponse
from app.services.stats import get_featured_event, get_total_organisers, get_total_users

router = APIRouter()


@router.get("/", response_model=PlatformStatsResponse)
async def get_platform_stats(db: AsyncSession = Depends(get_db)):
    """Public endpoint returning platform statistics and the featured event."""
    total_users = await get_total_users(db)
    total_organisers = await get_total_organisers(db)

    event, save_count, is_admin_pick = await get_featured_event(db)

    featured = None
    if event:
        featured = FeaturedEventResponse(
            id=event.id,
            title=event.title,
            description=event.description,
            event_type=event.event_type,
            status=event.status,
            start_datetime=event.start_datetime,
            end_datetime=event.end_datetime,
            is_all_day=event.is_all_day,
            location_name=event.location_name,
            address=event.address,
            latitude=event.latitude,
            longitude=event.longitude,
            cover_image_url=event.cover_image_url,
            max_attendees=event.max_attendees,
            organiser_id=event.organiser_id,
            organiser=event.organiser,
            save_count=save_count,
            is_admin_pick=is_admin_pick,
            created_at=event.created_at,
            updated_at=event.updated_at,
        )

    return PlatformStatsResponse(
        total_users=total_users,
        total_organisers=total_organisers,
        featured_event=featured,
    )
