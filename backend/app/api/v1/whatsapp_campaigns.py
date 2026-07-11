from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.whatsapp_campaign_service import (
    get_whatsapp_campaigns, get_whatsapp_campaign,
    create_whatsapp_campaign, delete_whatsapp_campaign,
    send_whatsapp_campaign, get_whatsapp_recipients,
    schedule_whatsapp_campaign, cancel_whatsapp_schedule
)
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

router = APIRouter()


class WhatsappCampaignCreate(BaseModel):
    name: str
    message: str


class WhatsappCampaignResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    message: str
    status: str
    sent_count: int
    failed_count: int
    created_at: datetime
    sent_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    schedule_failed_reason: Optional[str] = None

    class Config:
        from_attributes = True


class WhatsappRecipientResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    contact_id: UUID
    phone: str
    name: Optional[str] = None
    status: str
    error: Optional[str] = None
    message_sid: Optional[str] = None
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SendWhatsappRequest(BaseModel):
    contact_ids: Optional[List[UUID]] = None


class ScheduleWhatsappRequest(BaseModel):
    scheduled_at: datetime


@router.get("/", response_model=List[WhatsappCampaignResponse])
def list_whatsapp_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_whatsapp_campaigns(db, current_user.id)


@router.post("/", response_model=WhatsappCampaignResponse)
def add_whatsapp_campaign(
    data: WhatsappCampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_whatsapp_campaign(db, data.name, data.message, current_user.id)


@router.delete("/{campaign_id}")
def remove_whatsapp_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_whatsapp_campaign(db, campaign_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="WhatsApp campaign not found")
    return {"message": "Deleted"}


@router.post("/{campaign_id}/send")
def send_whatsapp(
    campaign_id: str,
    data: SendWhatsappRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = send_whatsapp_campaign(
        db, campaign_id, current_user.id, data.contact_ids
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ── Scheduling (Priority 5) ───────────────────────────────────────────────────

@router.post("/{campaign_id}/schedule", response_model=WhatsappCampaignResponse)
def schedule_whatsapp_route(
    campaign_id: str,
    data: ScheduleWhatsappRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = schedule_whatsapp_campaign(db, campaign_id, current_user.id, data.scheduled_at)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["campaign"]


@router.delete("/{campaign_id}/schedule", response_model=WhatsappCampaignResponse)
def cancel_whatsapp_schedule_route(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = cancel_whatsapp_schedule(db, campaign_id, current_user.id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["campaign"]


@router.get("/{campaign_id}/recipients", response_model=List[WhatsappRecipientResponse])
def get_recipients(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_whatsapp_recipients(db, campaign_id, current_user.id)
