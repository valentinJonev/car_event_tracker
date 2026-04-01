from __future__ import annotations

from datetime import timedelta

from icalendar import Calendar, Event as ICalEvent, vGeo

from app.models.event import Event


def _build_vevent(event: Event) -> ICalEvent:
    """Build a VEVENT component from a database Event."""
    ical_event = ICalEvent()
    ical_event.add("summary", event.title)

    if event.is_all_day:
        start_date = event.start_datetime.date()
        ical_event.add("dtstart", start_date)
        if event.end_datetime:
            end_date = event.end_datetime.date() + timedelta(days=1)
            ical_event.add("dtend", end_date)
        else:
            ical_event.add("dtend", start_date + timedelta(days=1))
    else:
        ical_event.add("dtstart", event.start_datetime)
        if event.end_datetime:
            ical_event.add("dtend", event.end_datetime)

    if event.description:
        ical_event.add("description", event.description)

    location_parts = [event.location_name]
    if event.address:
        location_parts.append(event.address)
    ical_event.add("location", ", ".join(location_parts))

    ical_event.add("geo", (event.latitude, event.longitude))
    ical_event.add("uid", f"{event.id}@carevents.com")

    # Mark cancelled events with the METHOD-independent STATUS property
    if event.status == "cancelled":
        ical_event.add("status", "CANCELLED")

    # Use updated_at as the LAST-MODIFIED so calendar apps detect changes
    if event.updated_at:
        ical_event.add("last-modified", event.updated_at)
    if event.created_at:
        ical_event.add("dtstamp", event.created_at)

    return ical_event


def generate_ics(event: Event) -> bytes:
    """Generate an .ics calendar file for a single event (download)."""
    cal = Calendar()
    cal.add("prodid", "-//Car Event Tracker//EN")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")

    cal.add_component(_build_vevent(event))
    return cal.to_ical()


def generate_feed(events: list[Event]) -> bytes:
    """Generate a subscribable .ics calendar feed containing multiple events.

    The feed sets X-WR-CALNAME so calendar apps show a friendly name, and
    uses METHOD:PUBLISH which is the standard for read-only subscription feeds.
    The REFRESH-INTERVAL and X-PUBLISHED-TTL properties tell calendar clients
    to re-fetch every 30 minutes so updates propagate quickly.
    """
    cal = Calendar()
    cal.add("prodid", "-//Car Event Tracker//EN")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")
    cal.add("method", "PUBLISH")
    cal.add("x-wr-calname", "My Car Events")
    cal.add("x-wr-caldesc", "Your saved events from Car Event Tracker")
    # Ask clients to refresh every 30 minutes
    cal.add("refresh-interval;value=duration", "PT30M")
    cal.add("x-published-ttl", "PT30M")

    for event in events:
        cal.add_component(_build_vevent(event))

    return cal.to_ical()
