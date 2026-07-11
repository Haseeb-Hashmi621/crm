from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class CampaignCreate(BaseModel):
    name: str
    subject: str
    body: str


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None


class CampaignRecipientResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    contact_id: UUID
    email: str
    name: Optional[str] = None
    status: str
    opened: bool
    clicked: bool
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CampaignResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    subject: str
    body: str
    status: str
    sent_count: int
    open_count: int
    click_count: int
    created_at: datetime
    sent_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    schedule_failed_reason: Optional[str] = None

    class Config:
        from_attributes = True


class SendCampaignRequest(BaseModel):
    contact_ids: Optional[List[UUID]] = None


class ScheduleCampaignRequest(BaseModel):
    scheduled_at: datetime
    # Specific contacts chosen in the "Select specific contacts" UI path.
    # None/omitted = all contacts (matches send_campaign's existing default).
    contact_ids: Optional[List[UUID]] = None