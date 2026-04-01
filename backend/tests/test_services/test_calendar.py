import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock

from icalendar import Calendar

from app.models.event import Event, EventStatus, EventType
from app.services.calendar import generate_ics
import uuid


class TestGenerateIcs:
    def _make_event(self, **overrides):
        defaults = {
            "id": uuid.uuid4(),
            "title": "Test Race Day",
            "description": "An exciting race event",
            "event_type": EventType.RACING,
            "status": EventStatus.PUBLISHED,
            "start_datetime": datetime(2025, 6, 15, 10, 0, tzinfo=timezone.utc),
            "end_datetime": datetime(2025, 6, 15, 18, 0, tzinfo=timezone.utc),
            "location_name": "Test Raceway",
            "address": "123 Race Street",
            "latitude": 42.6977,
            "longitude": 23.3219,
        }
        defaults.update(overrides)
        event = MagicMock(spec=Event)
        for key, value in defaults.items():
            setattr(event, key, value)
        return event

    def test_generates_valid_ics(self):
        event = self._make_event()
        ics_bytes = generate_ics(event)
        # Should be parseable
        cal = Calendar.from_ical(ics_bytes)
        assert cal is not None

    def test_contains_correct_title(self):
        event = self._make_event(title="My Custom Race")
        ics_bytes = generate_ics(event)
        cal = Calendar.from_ical(ics_bytes)
        for component in cal.walk():
            if component.name == "VEVENT":
                assert str(component.get("summary")) == "My Custom Race"

    def test_contains_correct_dates(self):
        start = datetime(2025, 6, 15, 10, 0, tzinfo=timezone.utc)
        end = datetime(2025, 6, 15, 18, 0, tzinfo=timezone.utc)
        event = self._make_event(start_datetime=start, end_datetime=end)
        ics_bytes = generate_ics(event)
        cal = Calendar.from_ical(ics_bytes)
        for component in cal.walk():
            if component.name == "VEVENT":
                assert component.get("dtstart").dt == start
                assert component.get("dtend").dt == end

    def test_contains_location(self):
        event = self._make_event(
            location_name="Sofia Raceway", address="123 Track Rd"
        )
        ics_bytes = generate_ics(event)
        cal = Calendar.from_ical(ics_bytes)
        for component in cal.walk():
            if component.name == "VEVENT":
                location = str(component.get("location"))
                assert "Sofia Raceway" in location
                assert "123 Track Rd" in location

    def test_contains_geo_coordinates(self):
        event = self._make_event(latitude=42.6977, longitude=23.3219)
        ics_bytes = generate_ics(event)
        cal = Calendar.from_ical(ics_bytes)
        for component in cal.walk():
            if component.name == "VEVENT":
                geo = component.get("geo")
                assert geo is not None

    def test_handles_no_end_date(self):
        event = self._make_event(end_datetime=None)
        ics_bytes = generate_ics(event)
        cal = Calendar.from_ical(ics_bytes)
        for component in cal.walk():
            if component.name == "VEVENT":
                assert component.get("dtend") is None

    def test_handles_no_description(self):
        event = self._make_event(description=None)
        ics_bytes = generate_ics(event)
        cal = Calendar.from_ical(ics_bytes)
        # Should still be valid
        assert ics_bytes is not None
