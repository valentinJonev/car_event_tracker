from __future__ import annotations

from uuid import UUID

from geoalchemy2.functions import ST_DWithin
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.models.subscription import FilterType, Subscription
from app.schemas.subscription import SubscriptionCreate


async def create_subscription(
    db: AsyncSession, user_id: UUID, data: SubscriptionCreate
) -> Subscription:
    sub = Subscription(
        user_id=user_id,
        filter_type=data.filter_type,
        filter_value=data.filter_value,
        filter_meta=data.filter_meta,
    )
    db.add(sub)
    await db.flush()
    await db.refresh(sub)
    return sub


async def list_user_subscriptions(
    db: AsyncSession, user_id: UUID
) -> tuple[list[Subscription], int]:
    count_result = await db.execute(
        select(func.count(Subscription.id)).where(Subscription.user_id == user_id)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .order_by(Subscription.created_at.desc())
    )
    subs = list(result.scalars().all())
    return subs, total


async def get_subscription_by_id(
    db: AsyncSession, sub_id: UUID
) -> Subscription | None:
    result = await db.execute(select(Subscription).where(Subscription.id == sub_id))
    return result.scalar_one_or_none()


async def delete_subscription(db: AsyncSession, sub: Subscription) -> None:
    await db.delete(sub)
    await db.flush()


async def find_matching_subscriptions(
    db: AsyncSession, event: Event
) -> list[Subscription]:
    """Find all subscriptions that match a given event."""
    matching = []

    # 1. Match by organiser
    organiser_result = await db.execute(
        select(Subscription).where(
            and_(
                Subscription.filter_type == FilterType.ORGANISER,
                Subscription.filter_value == str(event.organiser_id),
            )
        )
    )
    matching.extend(organiser_result.scalars().all())

    # 2. Match by event type
    type_result = await db.execute(
        select(Subscription).where(
            and_(
                Subscription.filter_type == FilterType.EVENT_TYPE,
                Subscription.filter_value == event.event_type.value,
            )
        )
    )
    matching.extend(type_result.scalars().all())

    # 3. Match by location (using PostGIS proximity)
    if event.location:
        location_subs_result = await db.execute(
            select(Subscription).where(
                Subscription.filter_type == FilterType.LOCATION
            )
        )
        location_subs = location_subs_result.scalars().all()

        for sub in location_subs:
            try:
                # filter_value format: "lat,lng"
                parts = sub.filter_value.split(",")
                sub_lat = float(parts[0])
                sub_lng = float(parts[1])
                radius_km = 50.0  # default
                if sub.filter_meta and "radius_km" in sub.filter_meta:
                    radius_km = float(sub.filter_meta["radius_km"])

                radius_meters = radius_km * 1000
                sub_point = func.ST_SetSRID(
                    func.ST_MakePoint(sub_lng, sub_lat), 4326
                )

                # Check if event is within radius of subscription point
                check_result = await db.execute(
                    select(func.ST_DWithin(event.location, sub_point, radius_meters))
                )
                is_within = check_result.scalar()
                if is_within:
                    matching.append(sub)
            except (ValueError, IndexError):
                continue

    # Deduplicate by subscription ID
    seen_ids = set()
    unique_matching = []
    for sub in matching:
        if sub.id not in seen_ids:
            seen_ids.add(sub.id)
            unique_matching.append(sub)

    return unique_matching
