from sqlalchemy.orm import Session
from datetime import datetime, date, time, timedelta, timezone as dt_timezone
from typing import List, Optional
import uuid
import re

from app.core.config import settings
from app.models.meeting_scheduler import MeetingType, AvailabilitySchedule, AvailabilityOverride, Booking
from app.models.contact import Contact
from app.models.calendar_event import CalendarEvent
from app.models.task import Task
import resend

resend.api_key = settings.RESEND_API_KEY

MIN_NOTICE_HOURS = 2
MAX_BOOKING_WINDOW_DAYS = 30


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "meeting"


# ── Meeting Types ────────────────────────────────────────────────────────────

def get_meeting_types(db: Session, user_id: uuid.UUID, active_only: bool = False) -> List[MeetingType]:
    q = db.query(MeetingType).filter(MeetingType.user_id == user_id)
    if active_only:
        q = q.filter(MeetingType.is_active == True)
    return q.order_by(MeetingType.created_at.desc()).all()


def create_meeting_type(db: Session, user_id: uuid.UUID, data) -> MeetingType:
    base_slug = _slugify(data.slug or data.name)
    slug = base_slug
    n = 1
    while db.query(MeetingType).filter(MeetingType.user_id == user_id, MeetingType.slug == slug).first():
        n += 1
        slug = f"{base_slug}-{n}"

    mt = MeetingType(
        user_id=user_id,
        name=data.name,
        slug=slug,
        description=data.description,
        duration_minutes=data.duration_minutes,
        buffer_before_minutes=data.buffer_before_minutes,
        buffer_after_minutes=data.buffer_after_minutes,
        color=data.color or "violet",
        is_active=data.is_active,
        location=data.location,
    )
    db.add(mt)
    db.commit()
    db.refresh(mt)
    return mt


def update_meeting_type(db: Session, user_id: uuid.UUID, meeting_type_id: str, data) -> Optional[MeetingType]:
    mt = db.query(MeetingType).filter(MeetingType.id == meeting_type_id, MeetingType.user_id == user_id).first()
    if not mt:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(mt, key, value)
    db.commit()
    db.refresh(mt)
    return mt


def delete_meeting_type(db: Session, user_id: uuid.UUID, meeting_type_id: str) -> bool:
    mt = db.query(MeetingType).filter(MeetingType.id == meeting_type_id, MeetingType.user_id == user_id).first()
    if not mt:
        return False
    db.delete(mt)
    db.commit()
    return True


# ── Availability ─────────────────────────────────────────────────────────────

def get_weekly_schedule(db: Session, user_id: uuid.UUID) -> List[AvailabilitySchedule]:
    return db.query(AvailabilitySchedule).filter(
        AvailabilitySchedule.user_id == user_id
    ).order_by(AvailabilitySchedule.day_of_week.asc()).all()


def set_weekly_schedule(db: Session, user_id: uuid.UUID, days: list) -> List[AvailabilitySchedule]:
    """Replaces the full weekly schedule for the user with the given days."""
    db.query(AvailabilitySchedule).filter(AvailabilitySchedule.user_id == user_id).delete()
    rows = []
    for d in days:
        row = AvailabilitySchedule(
            user_id=user_id,
            day_of_week=d.day_of_week,
            start_time=d.start_time,
            end_time=d.end_time,
            is_active=d.is_active,
        )
        db.add(row)
        rows.append(row)
    db.commit()
    for r in rows:
        db.refresh(r)
    return rows


def get_overrides(db: Session, user_id: uuid.UUID, from_date: Optional[date] = None) -> List[AvailabilityOverride]:
    q = db.query(AvailabilityOverride).filter(AvailabilityOverride.user_id == user_id)
    if from_date:
        q = q.filter(AvailabilityOverride.date >= from_date)
    return q.order_by(AvailabilityOverride.date.asc()).all()


def create_override(db: Session, user_id: uuid.UUID, data) -> AvailabilityOverride:
    existing = db.query(AvailabilityOverride).filter(
        AvailabilityOverride.user_id == user_id, AvailabilityOverride.date == data.date
    ).first()
    if existing:
        existing.is_blocked = data.is_blocked
        existing.start_time = data.start_time
        existing.end_time = data.end_time
        existing.reason = data.reason
        db.commit()
        db.refresh(existing)
        return existing
    row = AvailabilityOverride(
        user_id=user_id, date=data.date, is_blocked=data.is_blocked,
        start_time=data.start_time, end_time=data.end_time, reason=data.reason,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_override(db: Session, user_id: uuid.UUID, override_id: str) -> bool:
    row = db.query(AvailabilityOverride).filter(
        AvailabilityOverride.id == override_id, AvailabilityOverride.user_id == user_id
    ).first()
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


# ── Slot computation ─────────────────────────────────────────────────────────

def _day_window(db: Session, user_id: uuid.UUID, day: date, weekly_by_day: dict):
    """Returns (start_time, end_time) or None if the day is unavailable."""
    override = db.query(AvailabilityOverride).filter(
        AvailabilityOverride.user_id == user_id, AvailabilityOverride.date == day
    ).first()
    if override:
        if override.is_blocked:
            return None
        if override.start_time and override.end_time:
            return (override.start_time, override.end_time)

    weekday = day.weekday()  # Mon=0 ... Sun=6
    sched = weekly_by_day.get(weekday)
    if not sched or not sched.is_active:
        return None
    return (sched.start_time, sched.end_time)


def compute_available_slots(
    db: Session, user_id: uuid.UUID, meeting_type: MeetingType,
    date_from: date, date_to: date,
) -> List[dict]:
    weekly = get_weekly_schedule(db, user_id)
    weekly_by_day = {s.day_of_week: s for s in weekly}

    step_minutes = meeting_type.duration_minutes + meeting_type.buffer_after_minutes
    duration = timedelta(minutes=meeting_type.duration_minutes)
    step = timedelta(minutes=step_minutes)

    now = datetime.now(dt_timezone.utc)
    earliest_allowed = now + timedelta(hours=MIN_NOTICE_HOURS)

    range_start = datetime.combine(date_from, time.min, tzinfo=dt_timezone.utc)
    range_end = datetime.combine(date_to, time.max, tzinfo=dt_timezone.utc)

    existing_bookings = db.query(Booking).filter(
        Booking.user_id == user_id,
        Booking.status == "confirmed",
        Booking.start_time < range_end,
        Booking.end_time > range_start,
    ).all()
    existing_events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == user_id,
        CalendarEvent.status != "cancelled",
        CalendarEvent.start_time < range_end,
        CalendarEvent.start_time >= range_start - timedelta(days=1),
    ).all()

    busy_ranges = []
    for b in existing_bookings:
        busy_ranges.append((b.start_time, b.end_time))
    for e in existing_events:
        e_start = e.start_time
        e_end = e.end_time or (e.start_time + timedelta(hours=1))
        busy_ranges.append((e_start, e_end))

    def overlaps(s, en):
        for bs, be in busy_ranges:
            if s < be and en > bs:
                return True
        return False

    results = []
    day = date_from
    while day <= date_to:
        window = _day_window(db, user_id, day, weekly_by_day)
        if window:
            start_t, end_t = window
            cursor = datetime.combine(day, start_t, tzinfo=dt_timezone.utc)
            day_end = datetime.combine(day, end_t, tzinfo=dt_timezone.utc)
            slots = []
            while cursor + duration <= day_end:
                slot_end = cursor + duration
                if cursor >= earliest_allowed and not overlaps(cursor, slot_end):
                    slots.append({"start": cursor, "end": slot_end})
                cursor += step
            if slots:
                results.append({"date": day, "slots": slots})
        day += timedelta(days=1)

    return results


# ── Booking ──────────────────────────────────────────────────────────────────

def _find_or_create_contact(db: Session, user_id: uuid.UUID, name: str, email: str, phone: Optional[str]) -> Contact:
    existing = db.query(Contact).filter(Contact.user_id == user_id, Contact.email == email).first()
    if existing:
        return existing
    parts = name.strip().split(" ", 1)
    contact = Contact(
        user_id=user_id,
        first_name=parts[0] if parts else "Guest",
        last_name=parts[1] if len(parts) > 1 else None,
        email=email,
        phone=phone,
    )
    db.add(contact)
    db.flush()
    return contact


def _send_confirmation_emails(host_email: str, meeting_type: MeetingType, guest_name: str, guest_email: str, start_time: datetime):
    when_str = start_time.strftime("%A, %d %B %Y at %H:%M UTC")
    guest_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p>Hi {guest_name},</p>
        <p>Your <strong>{meeting_type.name}</strong> is confirmed for <strong>{when_str}</strong>.</p>
        <p>Location: {meeting_type.location or 'Details to follow'}</p>
        <p>We look forward to speaking with you.</p>
    </div>
    """
    host_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p>New booking: <strong>{meeting_type.name}</strong> with {guest_name} ({guest_email})</p>
        <p>When: {when_str}</p>
    </div>
    """
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": guest_email,
            "subject": f"Confirmed: {meeting_type.name}",
            "html": guest_html,
        })
    except Exception:
        pass
    try:
        if host_email:
            resend.Emails.send({
                "from": settings.RESEND_FROM_EMAIL,
                "to": host_email,
                "subject": f"New booking: {meeting_type.name} with {guest_name}",
                "html": host_html,
            })
    except Exception:
        pass


def create_public_booking(db: Session, user_id: uuid.UUID, data) -> dict:
    from app.models.user import User

    meeting_type = db.query(MeetingType).filter(
        MeetingType.id == data.meeting_type_id, MeetingType.user_id == user_id, MeetingType.is_active == True
    ).first()
    if not meeting_type:
        return {"error": "Meeting type not found"}

    start_time = data.start_time
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=dt_timezone.utc)
    end_time = start_time + timedelta(minutes=meeting_type.duration_minutes)

    now = datetime.now(dt_timezone.utc)
    if start_time < now + timedelta(hours=MIN_NOTICE_HOURS):
        return {"error": "This time no longer allows enough advance notice. Please pick another slot."}

    conflict = db.query(Booking).filter(
        Booking.user_id == user_id,
        Booking.status == "confirmed",
        Booking.start_time < end_time,
        Booking.end_time > start_time,
    ).first()
    if conflict:
        return {"error": "This slot was just booked by someone else. Please choose another time."}

    contact = _find_or_create_contact(db, user_id, data.guest_name, data.guest_email, data.guest_phone)

    calendar_event = CalendarEvent(
        user_id=user_id,
        contact_id=contact.id,
        title=f"{meeting_type.name} — {data.guest_name}",
        description=data.guest_notes,
        location=meeting_type.location,
        event_type="meeting",
        status="scheduled",
        start_time=start_time,
        end_time=end_time,
        color=meeting_type.color or "violet",
    )
    db.add(calendar_event)
    db.flush()

    task = Task(
        user_id=user_id,
        contact_id=contact.id,
        title=f"Meeting: {meeting_type.name} with {data.guest_name}",
        task_type="meeting",
        priority="high",
        status="pending",
        due_at=start_time,
        notes=f"Booked via public scheduling page.{(' Notes: ' + data.guest_notes) if data.guest_notes else ''}",
    )
    db.add(task)
    db.flush()

    booking = Booking(
        user_id=user_id,
        meeting_type_id=meeting_type.id,
        contact_id=contact.id,
        calendar_event_id=calendar_event.id,
        task_id=task.id,
        guest_name=data.guest_name,
        guest_email=data.guest_email,
        guest_phone=data.guest_phone,
        guest_notes=data.guest_notes,
        start_time=start_time,
        end_time=end_time,
        timezone=data.timezone or "Asia/Karachi",
        status="confirmed",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    host = db.query(User).filter(User.id == user_id).first()
    _send_confirmation_emails(
        host.email if host else "", meeting_type, data.guest_name, data.guest_email, start_time,
    )

    return {"booking": booking}


# ── Admin booking management ─────────────────────────────────────────────────

def get_bookings(db: Session, user_id: uuid.UUID, status: Optional[str] = None, upcoming_only: bool = False) -> List[Booking]:
    q = db.query(Booking).filter(Booking.user_id == user_id)
    if status:
        q = q.filter(Booking.status == status)
    if upcoming_only:
        q = q.filter(Booking.start_time >= datetime.now(dt_timezone.utc))
    return q.order_by(Booking.start_time.asc()).all()


def cancel_booking(db: Session, user_id: uuid.UUID, booking_id: str, reason: Optional[str]) -> Optional[Booking]:
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == user_id).first()
    if not booking:
        return None
    booking.status = "cancelled"
    booking.cancel_reason = reason
    if booking.calendar_event_id:
        event = db.query(CalendarEvent).filter(CalendarEvent.id == booking.calendar_event_id).first()
        if event:
            event.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return booking