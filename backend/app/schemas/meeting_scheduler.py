from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date, time


class MeetingTypeCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: int = 30
    buffer_before_minutes: int = 0
    buffer_after_minutes: int = 10
    color: Optional[str] = "violet"
    is_active: bool = True
    location: Optional[str] = "Phone / WhatsApp call"


class MeetingTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    buffer_before_minutes: Optional[int] = None
    buffer_after_minutes: Optional[int] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    location: Optional[str] = None


class MeetingTypeResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    duration_minutes: int
    buffer_before_minutes: int
    buffer_after_minutes: int
    color: Optional[str] = None
    is_active: bool
    location: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PublicMeetingType(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    duration_minutes: int
    color: Optional[str] = None
    location: Optional[str] = None

    class Config:
        from_attributes = True


class AvailabilityDay(BaseModel):
    day_of_week: int   # 0=Mon ... 6=Sun
    start_time: time
    end_time: time
    is_active: bool = True


class AvailabilityScheduleResponse(BaseModel):
    id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    is_active: bool

    class Config:
        from_attributes = True


class SetAvailabilityRequest(BaseModel):
    days: List[AvailabilityDay]


class AvailabilityOverrideCreate(BaseModel):
    date: date
    is_blocked: bool = True
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    reason: Optional[str] = None


class AvailabilityOverrideResponse(BaseModel):
    id: UUID
    date: date
    is_blocked: bool
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    reason: Optional[str] = None

    class Config:
        from_attributes = True


class TimeSlot(BaseModel):
    start: datetime
    end: datetime


class DaySlots(BaseModel):
    date: date
    slots: List[TimeSlot]


class AvailableSlotsResponse(BaseModel):
    meeting_type_id: UUID
    duration_minutes: int
    timezone: str
    days: List[DaySlots]


class PublicBookingCreate(BaseModel):
    meeting_type_id: UUID
    start_time: datetime
    guest_name: str
    guest_email: EmailStr
    guest_phone: Optional[str] = None
    guest_notes: Optional[str] = None
    timezone: Optional[str] = "Asia/Karachi"


class ContactMini(BaseModel):
    id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True


class BookingResponse(BaseModel):
    id: UUID
    user_id: UUID
    meeting_type_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    guest_name: str
    guest_email: str
    guest_phone: Optional[str] = None
    guest_notes: Optional[str] = None
    start_time: datetime
    end_time: datetime
    timezone: str
    status: str
    cancel_reason: Optional[str] = None
    created_at: datetime
    meeting_type: Optional[MeetingTypeResponse] = None
    contact: Optional[ContactMini] = None

    class Config:
        from_attributes = True


class CancelBookingRequest(BaseModel):
    reason: Optional[str] = None