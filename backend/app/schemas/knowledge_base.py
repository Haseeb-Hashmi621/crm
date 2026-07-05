from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class KnowledgeBaseEntryCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    is_active: bool = True


class KnowledgeBaseEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class KnowledgeBaseEntryResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    content: str
    category: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True