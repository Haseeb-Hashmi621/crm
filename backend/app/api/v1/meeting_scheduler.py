from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.meeting_scheduler import (
    MeetingTypeCreate, MeetingTypeUpdate, MeetingTypeResponse,
    SetAvailabilityRequest, AvailabilityScheduleResponse,
    AvailabilityOverrideCreate, AvailabilityOverrideResponse,
    BookingResponse, CancelBookingRequest,
)
from app.services import meeting_scheduler_service as svc

router = APIRouter()


@router.get("/meeting-types", response_model=List[MeetingTypeResponse])
def list_meeting_types(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return svc.get_meeting_types(db, current_user.id)


@router.post("/meeting-types", response_model=MeetingTypeResponse)
def add_meeting_type(data: MeetingTypeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return svc.create_meeting_type(db, current_user.id, data)


@router.patch("/meeting-types/{meeting_type_id}", response_model=MeetingTypeResponse)
def edit_meeting_type(meeting_type_id: str, data: MeetingTypeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mt = svc.update_meeting_type(db, current_user.id, meeting_type_id, data)
    if not mt:
        raise HTTPException(status_code=404, detail="Meeting type not found")
    return mt


@router.delete("/meeting-types/{meeting_type_id}")
def remove_meeting_type(meeting_type_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = svc.delete_meeting_type(db, current_user.id, meeting_type_id)
    if not success:
        raise HTTPException(status_code=404, detail="Meeting type not found")
    return {"message": "Meeting type deleted"}


@router.get("/availability", response_model=List[AvailabilityScheduleResponse])
def get_availability(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return svc.get_weekly_schedule(db, current_user.id)


@router.put("/availability", response_model=List[AvailabilityScheduleResponse])
def put_availability(data: SetAvailabilityRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return svc.set_weekly_schedule(db, current_user.id, data.days)


@router.get("/overrides", response_model=List[AvailabilityOverrideResponse])
def list_overrides(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return svc.get_overrides(db, current_user.id)


@router.post("/overrides", response_model=AvailabilityOverrideResponse)
def add_override(data: AvailabilityOverrideCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return svc.create_override(db, current_user.id, data)


@router.delete("/overrides/{override_id}")
def remove_override(override_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = svc.delete_override(db, current_user.id, override_id)
    if not success:
        raise HTTPException(status_code=404, detail="Override not found")
    return {"message": "Override deleted"}


@router.get("/bookings", response_model=List[BookingResponse])
def list_bookings(
    status: Optional[str] = Query(None),
    upcoming_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.get_bookings(db, current_user.id, status, upcoming_only)


@router.post("/bookings/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking_route(booking_id: str, data: CancelBookingRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = svc.cancel_booking(db, current_user.id, booking_id, data.reason)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking