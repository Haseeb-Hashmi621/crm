from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class DealCreate(BaseModel):
    title: str
    value: Optional[float] = 0
    stage: Optional[str] = "new"
    contact_name: Optional[str] = None
    company: Optional[str] = None
    owner: Optional[str] = None

class DealUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[float] = None
    stage: Optional[str] = None
    contact_name: Optional[str] = None
    company: Optional[str] = None
    owner: Optional[str] = None

class DealResponse(BaseModel):
    id: UUID
    title: str
    value: float
    stage: str
    contact_name: Optional[str] = None
    company: Optional[str] = None
    owner: Optional[str] = None

    class Config:
        from_attributes = True