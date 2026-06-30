from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.calendar_event import CalendarEvent
from app.schemas.calendar_event import CalendarEventCreate, CalendarEventUpdate, CalendarEventResponse
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter()


def _query(db: Session, user_id):
    return db.query(CalendarEvent).options(
        joinedload(CalendarEvent.contact),
        joinedload(CalendarEvent.deal),
    ).filter(CalendarEvent.user_id == user_id)


# IMPORTANT: static routes must come before /{event_id}

@router.get("/today", response_model=List[CalendarEventResponse])
def get_today_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    return _query(db, current_user.id).filter(
        CalendarEvent.start_time >= start,
        CalendarEvent.start_time <= end,
    ).order_by(CalendarEvent.start_time.asc()).all()


@router.get("/upcoming", response_model=List[CalendarEventResponse])
def get_upcoming_events(
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    return _query(db, current_user.id).filter(
        CalendarEvent.start_time >= now,
        CalendarEvent.status == "scheduled",
    ).order_by(CalendarEvent.start_time.asc()).limit(limit).all()


@router.get("/range", response_model=List[CalendarEventResponse])
def get_events_in_range(
    start: datetime = Query(...),
    end: datetime = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Used by the month/week grid view to fetch all events overlapping the visible range."""
    return _query(db, current_user.id).filter(
        CalendarEvent.start_time <= end,
        and_(
            CalendarEvent.end_time.isnot(None), CalendarEvent.end_time >= start,
        ) | and_(
            CalendarEvent.end_time.is_(None), CalendarEvent.start_time >= start,
        )
    ).order_by(CalendarEvent.start_time.asc()).all()


@router.get("/", response_model=List[CalendarEventResponse])
def list_events(
    contact_id: Optional[uuid.UUID] = Query(None),
    deal_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = _query(db, current_user.id)
    if contact_id:
        query = query.filter(CalendarEvent.contact_id == contact_id)
    if deal_id:
        query = query.filter(CalendarEvent.deal_id == deal_id)
    if status:
        query = query.filter(CalendarEvent.status == status)
    return query.order_by(CalendarEvent.start_time.asc()).all()


@router.post("/", response_model=CalendarEventResponse)
def create_event(
    data: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = CalendarEvent(
        user_id=current_user.id,
        contact_id=data.contact_id,
        deal_id=data.deal_id,
        title=data.title,
        description=data.description,
        location=data.location,
        event_type=data.event_type or "meeting",
        start_time=data.start_time,
        end_time=data.end_time,
        all_day=data.all_day or False,
        reminder_minutes=data.reminder_minutes,
        color=data.color or "violet",
        status="scheduled",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return _query(db, current_user.id).filter(CalendarEvent.id == event.id).first()


@router.get("/{event_id}", response_model=CalendarEventResponse)
def get_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = _query(db, current_user.id).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/{event_id}", response_model=CalendarEventResponse)
def update_event(
    event_id: uuid.UUID,
    data: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    return _query(db, current_user.id).filter(CalendarEvent.id == event.id).first()


@router.post("/{event_id}/complete", response_model=CalendarEventResponse)
def complete_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = "completed"
    db.commit()
    db.refresh(event)
    return _query(db, current_user.id).filter(CalendarEvent.id == event.id).first()


@router.delete("/{event_id}")
def delete_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}