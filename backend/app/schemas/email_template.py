from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    body: str
    category: Optional[str] = "general"


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None


class EmailTemplateResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    subject: str
    body: str
    category: Optional[str] = "general"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True