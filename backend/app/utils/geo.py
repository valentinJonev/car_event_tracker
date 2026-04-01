"""Geolocation utility functions."""
from __future__ import annotations

import math


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth
    using the Haversine formula.

    Returns distance in kilometers.
    """
    R = 6371.0  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def make_wkt_point(longitude: float, latitude: float) -> str:
    """Create a WKT POINT string with SRID for PostGIS."""
    return f"SRID=4326;POINT({longitude} {latitude})"


def validate_coordinates(latitude: float, longitude: float) -> bool:
    """Validate that coordinates are within valid ranges."""
    return -90 <= latitude <= 90 and -180 <= longitude <= 180
