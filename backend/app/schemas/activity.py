from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class ActivityCreate(BaseModel):
    contact_id: UUID
    type: Optional[str] = "note"
    content: str

class ActivityResponse(BaseModel):
    id: UUID
    contact_id: UUID
    type: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True