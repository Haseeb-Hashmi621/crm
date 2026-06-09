from pydantic import BaseModel
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


class FilterRule(BaseModel):
    field: str        # first_name, last_name, email, phone, company, tag, has_email, has_phone
    operator: str     # contains, not_contains, equals, not_equals, is_empty, is_not_empty, has_tag
    value: Optional[Any] = None


class SegmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    filters: List[FilterRule] = []
    color: Optional[str] = "violet"


class SegmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    filters: Optional[List[FilterRule]] = None
    color: Optional[str] = None


class SegmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    filters: List[dict] = []
    color: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SegmentPreviewResponse(BaseModel):
    segment: SegmentResponse
    contact_count: int
    contacts: List[dict] = []