from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.deal import DealCreate, DealUpdate, DealResponse
from app.services.deal_service import get_deals, get_deal, create_deal, update_deal, delete_deal
from typing import List

router = APIRouter()

@router.get("/", response_model=List[DealResponse])
def list_deals(db: Session = Depends(get_db)):
    return get_deals(db)

@router.post("/", response_model=DealResponse)
def add_deal(deal_data: DealCreate, db: Session = Depends(get_db)):
    return create_deal(db, deal_data)

@router.get("/{deal_id}", response_model=DealResponse)
def get_one_deal(deal_id: str, db: Session = Depends(get_db)):
    deal = get_deal(db, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal

@router.put("/{deal_id}", response_model=DealResponse)
def edit_deal(deal_id: str, deal_data: DealUpdate, db: Session = Depends(get_db)):
    deal = update_deal(db, deal_id, deal_data)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal

@router.delete("/{deal_id}")
def remove_deal(deal_id: str, db: Session = Depends(get_db)):
    success = delete_deal(db, deal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Deal deleted"}