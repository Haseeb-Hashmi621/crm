from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse, CampaignRecipientResponse, SendCampaignRequest
from app.services.campaign_service import (
    get_campaigns, get_campaign, create_campaign,
    update_campaign, delete_campaign, send_campaign,
    get_campaign_recipients
)
from typing import List

router = APIRouter()


@router.get("/", response_model=List[CampaignResponse])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_campaigns(db, current_user.id)


@router.post("/", response_model=CampaignResponse)
def add_campaign(
    campaign_data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_campaign(db, campaign_data, current_user.id)


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_one_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = get_campaign(db, campaign_id, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.put("/{campaign_id}", response_model=CampaignResponse)
def edit_campaign(
    campaign_id: str,
    campaign_data: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = update_campaign(db, campaign_id, campaign_data, current_user.id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.delete("/{campaign_id}")
def remove_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_campaign(db, campaign_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted"}


@router.post("/{campaign_id}/send")
def send_campaign_route(
    campaign_id: str,
    send_data: SendCampaignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = send_campaign(
        db,
        campaign_id,
        current_user.id,
        send_data.contact_ids
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{campaign_id}/recipients", response_model=List[CampaignRecipientResponse])
def get_recipients(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_campaign_recipients(db, campaign_id, current_user.id)