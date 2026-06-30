from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    event_type: Optional[str] = "meeting"
    start_time: datetime
    end_time: Optional[datetime] = None
    all_day: Optional[bool] = False
    reminder_minutes: Optional[int] = None
    color: Optional[str] = "violet"
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    event_type: Optional[str] = None
    status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: Optional[bool] = None
    reminder_minutes: Optional[int] = None
    color: Optional[str] = None
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None


class ContactMini(BaseModel):
    id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class DealMini(BaseModel):
    id: UUID
    title: str

    class Config:
        from_attributes = True


class CalendarEventResponse(BaseModel):
    id: UUID
    user_id: UUID
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    event_type: str
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    all_day: bool
    reminder_minutes: Optional[int] = None
    color: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    contact: Optional[ContactMini] = None
    deal: Optional[DealMini] = None

    class Config:
        from_attributes = True