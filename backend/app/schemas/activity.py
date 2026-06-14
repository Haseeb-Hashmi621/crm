from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class ActivityCreate(BaseModel):
    contact_id: UUID
    deal_id: Optional[UUID] = None
    type: Optional[str] = "note"
    content: str

class ActivityResponse(BaseModel):
    id: UUID
    contact_id: UUID
    deal_id: Optional[UUID] = None
    type: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ActivityContactInfo(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    class Config:
        from_attributes = True

class ActivityWithContact(BaseModel):
    id: UUID
    contact_id: UUID
    deal_id: Optional[UUID] = None
    type: str
    content: str
    created_at: datetime
    contact: ActivityContactInfo

    class Config:
        from_attributes = True