from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.activity import ActivityCreate, ActivityResponse
from app.services.activity_service import (
    get_activities_by_contact, get_activities_by_deal,
    create_activity, delete_activity
)
from typing import List

router = APIRouter()

@router.get("/contact/{contact_id}", response_model=List[ActivityResponse])
def list_contact_activities(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_activities_by_contact(db, contact_id)

@router.get("/deal/{deal_id}", response_model=List[ActivityResponse])
def list_deal_activities(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_activities_by_deal(db, deal_id)

# Keep old route as alias so ContactDetail.jsx doesn't break
@router.get("/{contact_id}", response_model=List[ActivityResponse])
def list_activities_legacy(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_activities_by_contact(db, contact_id)

@router.post("/", response_model=ActivityResponse)
def add_activity(
    activity_data: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_activity(db, activity_data)

@router.delete("/{activity_id}")
def remove_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_activity(db, activity_id)
    if not success:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"message": "Activity deleted"}