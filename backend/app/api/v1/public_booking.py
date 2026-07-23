from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
import uuid

from app.core.database import get_db
from app.models.user import User
from app.models.meeting_scheduler import MeetingType
from app.schemas.meeting_scheduler import (
    PublicMeetingType, AvailableSlotsResponse, DaySlots, TimeSlot,
    PublicBookingCreate,
)
from app.services import meeting_scheduler_service as svc

router = APIRouter()

MAX_WINDOW_DAYS = 30


@router.get("/{user_id}/meeting-types", response_model=List[PublicMeetingType])
def public_meeting_types(user_id: uuid.UUID, db: Session = Depends(get_db)):
    host = db.query(User).filter(User.id == user_id).first()
    if not host:
        raise HTTPException(status_code=404, detail="Scheduling page not found")
    return svc.get_meeting_types(db, user_id, active_only=True)


@router.get("/{user_id}/slots", response_model=AvailableSlotsResponse)
def public_slots(
    user_id: uuid.UUID,
    meeting_type_id: uuid.UUID = Query(...),
    date_from: Optional[date] = Query(None),
    days: int = Query(14, ge=1, le=MAX_WINDOW_DAYS),
    db: Session = Depends(get_db),
):
    meeting_type = db.query(MeetingType).filter(
        MeetingType.id == meeting_type_id, MeetingType.user_id == user_id, MeetingType.is_active == True
    ).first()
    if not meeting_type:
        raise HTTPException(status_code=404, detail="Meeting type not found")

    start = date_from or date.today()
    end = start + timedelta(days=days - 1)

    raw_days = svc.compute_available_slots(db, user_id, meeting_type, start, end)
    day_slots = [
        DaySlots(date=d["date"], slots=[TimeSlot(start=s["start"], end=s["end"]) for s in d["slots"]])
        for d in raw_days
    ]

    return AvailableSlotsResponse(
        meeting_type_id=meeting_type.id,
        duration_minutes=meeting_type.duration_minutes,
        timezone="UTC",
        days=day_slots,
    )


@router.post("/{user_id}/book")
def public_book(user_id: uuid.UUID, data: PublicBookingCreate, db: Session = Depends(get_db)):
    host = db.query(User).filter(User.id == user_id).first()
    if not host:
        raise HTTPException(status_code=404, detail="Scheduling page not found")

    result = svc.create_public_booking(db, user_id, data)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    booking = result["booking"]
    return {
        "id": booking.id,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "guest_name": booking.guest_name,
        "guest_email": booking.guest_email,
        "status": booking.status,
    }