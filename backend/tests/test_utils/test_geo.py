import pytest

from app.utils.geo import haversine_distance, make_wkt_point, validate_coordinates


class TestHaversineDistance:
    def test_same_point_returns_zero(self):
        dist = haversine_distance(42.6977, 23.3219, 42.6977, 23.3219)
        assert dist == pytest.approx(0.0)

    def test_known_distance(self):
        # Sofia to Plovdiv is approximately 130-135 km
        dist = haversine_distance(42.6977, 23.3219, 42.1354, 24.7453)
        assert 125 < dist < 145

    def test_antipodal_points(self):
        # North pole to south pole: ~20015 km
        dist = haversine_distance(90, 0, -90, 0)
        assert 20000 < dist < 20100

    def test_symmetry(self):
        d1 = haversine_distance(42.6977, 23.3219, 48.8566, 2.3522)
        d2 = haversine_distance(48.8566, 2.3522, 42.6977, 23.3219)
        assert d1 == pytest.approx(d2)


class TestMakeWktPoint:
    def test_creates_valid_wkt(self):
        wkt = make_wkt_point(23.3219, 42.6977)
        assert wkt == "SRID=4326;POINT(23.3219 42.6977)"

    def test_negative_coordinates(self):
        wkt = make_wkt_point(-73.9857, 40.7484)
        assert wkt == "SRID=4326;POINT(-73.9857 40.7484)"


class TestValidateCoordinates:
    def test_valid_coordinates(self):
        assert validate_coordinates(42.6977, 23.3219) is True

    def test_boundary_values(self):
        assert validate_coordinates(90, 180) is True
        assert validate_coordinates(-90, -180) is True

    def test_invalid_latitude(self):
        assert validate_coordinates(91, 0) is False
        assert validate_coordinates(-91, 0) is False

    def test_invalid_longitude(self):
        assert validate_coordinates(0, 181) is False
        assert validate_coordinates(0, -181) is False
