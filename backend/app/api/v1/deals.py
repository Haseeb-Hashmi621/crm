from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.deal import DealCreate, DealUpdate, DealResponse
from app.services.deal_service import get_deals, get_deal, create_deal, update_deal, delete_deal
from typing import List

router = APIRouter()

@router.get("/", response_model=List[DealResponse])
def list_deals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_deals(db, current_user.id)

@router.post("/", response_model=DealResponse)
def add_deal(
    deal_data: DealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_deal(db, deal_data, current_user.id)

@router.get("/{deal_id}", response_model=DealResponse)
def get_one_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deal = get_deal(db, deal_id, current_user.id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal

@router.put("/{deal_id}", response_model=DealResponse)
def edit_deal(
    deal_id: str,
    deal_data: DealUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deal = update_deal(db, deal_id, deal_data, current_user.id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal

@router.delete("/{deal_id}")
def remove_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_deal(db, deal_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Deal deleted successfully"}