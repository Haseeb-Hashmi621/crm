from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.activity import ActivityCreate, ActivityResponse
from app.services.activity_service import get_activities_by_contact, create_activity, delete_activity
from typing import List

router = APIRouter()

@router.get("/{contact_id}", response_model=List[ActivityResponse])
def list_activities(contact_id: str, db: Session = Depends(get_db)):
    return get_activities_by_contact(db, contact_id)

@router.post("/", response_model=ActivityResponse)
def add_activity(activity_data: ActivityCreate, db: Session = Depends(get_db)):
    return create_activity(db, activity_data)

@router.delete("/{activity_id}")
def remove_activity(activity_id: str, db: Session = Depends(get_db)):
    success = delete_activity(db, activity_id)
    if not success:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"message": "Activity deleted"}