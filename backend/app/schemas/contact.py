from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from app.schemas.tag import TagResponse


class ContactCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None


class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None


class ContactResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    tags: List[TagResponse] = []
    chatbot_enabled: bool = True

    class Config:
        from_attributes = True