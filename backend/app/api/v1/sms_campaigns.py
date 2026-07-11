from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.sms_campaign_service import (
    get_sms_campaigns, get_sms_campaign, create_sms_campaign,
    delete_sms_campaign, send_sms_campaign, get_sms_recipients,
    schedule_sms_campaign, cancel_sms_schedule
)
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

router = APIRouter()


class SmsCampaignCreate(BaseModel):
    name: str
    message: str


class SmsCampaignResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    message: str
    status: str
    sent_count: int
    created_at: datetime
    sent_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    schedule_failed_reason: Optional[str] = None

    class Config:
        from_attributes = True


class SmsRecipientResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    contact_id: UUID
    phone: str
    name: Optional[str] = None
    status: str
    error: Optional[str] = None
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SendSmsRequest(BaseModel):
    contact_ids: Optional[List[UUID]] = None


class ScheduleSmsRequest(BaseModel):
    scheduled_at: datetime
    contact_ids: Optional[List[UUID]] = None


@router.get("/", response_model=List[SmsCampaignResponse])
def list_sms_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_sms_campaigns(db, current_user.id)


@router.post("/", response_model=SmsCampaignResponse)
def add_sms_campaign(
    data: SmsCampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_sms_campaign(db, data.name, data.message, current_user.id)


@router.delete("/{campaign_id}")
def remove_sms_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_sms_campaign(db, campaign_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="SMS campaign not found")
    return {"message": "Deleted"}


@router.post("/{campaign_id}/send")
def send_sms(
    campaign_id: str,
    data: SendSmsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = send_sms_campaign(
        db,
        campaign_id,
        current_user.id,
        data.contact_ids
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ── Scheduling (Priority 5) ───────────────────────────────────────────────────

@router.post("/{campaign_id}/schedule", response_model=SmsCampaignResponse)
def schedule_sms_route(
    campaign_id: str,
    data: ScheduleSmsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = schedule_sms_campaign(
        db,
        campaign_id,
        current_user.id,
        data.scheduled_at,
        data.contact_ids,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["campaign"]


@router.delete("/{campaign_id}/schedule", response_model=SmsCampaignResponse)
def cancel_sms_schedule_route(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = cancel_sms_schedule(db, campaign_id, current_user.id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["campaign"]


@router.get("/{campaign_id}/recipients", response_model=List[SmsRecipientResponse])
def get_recipients(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_sms_recipients(db, campaign_id, current_user.id)