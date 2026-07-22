from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# ── Steps ─────────────────────────────────────────────────────────────────

class StepCreate(BaseModel):
    subject: str
    body: str
    delay_days: int = 0
    delay_hours: int = 0


class StepUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    delay_days: Optional[int] = None
    delay_hours: Optional[int] = None
    step_order: Optional[int] = None


class StepResponse(BaseModel):
    id: UUID
    sequence_id: UUID
    step_order: int
    subject: str
    body: str
    delay_days: int
    delay_hours: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Sequence ──────────────────────────────────────────────────────────────

class SequenceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    exit_on_reply: bool = True
    from_name: Optional[str] = None
    steps: List[StepCreate] = []


class SequenceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # draft | active | paused | archived
    exit_on_reply: Optional[bool] = None
    from_name: Optional[str] = None
    steps: Optional[List[StepCreate]] = None  # if provided, replaces all steps


class SequenceResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    status: str
    exit_on_reply: bool
    from_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    steps: List[StepResponse] = []

    class Config:
        from_attributes = True


class SequenceStatsResponse(BaseModel):
    sequence_id: UUID
    total_enrolled: int
    active: int
    completed: int
    paused: int
    cancelled: int
    exited: int
    failed: int
    total_emails_sent: int


# ── Enrollment ────────────────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    contact_ids: List[UUID]


class ContactMini(BaseModel):
    id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None

    class Config:
        from_attributes = True


class EnrollmentResponse(BaseModel):
    id: UUID
    sequence_id: UUID
    contact_id: UUID
    status: str
    current_step_index: int
    enrolled_at: datetime
    next_send_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_error: Optional[str] = None
    contact: Optional[ContactMini] = None

    class Config:
        from_attributes = True


class EnrollResponse(BaseModel):
    enrolled: int
    skipped: int
    skipped_reasons: List[str] = []