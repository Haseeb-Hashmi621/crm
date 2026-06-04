from sqlalchemy.orm import Session
from app.models.deal import Deal
from app.schemas.deal import DealCreate, DealUpdate
from typing import List, Optional
import uuid

def get_deals(db: Session, user_id: uuid.UUID) -> List[Deal]:
    return db.query(Deal).filter(Deal.user_id == user_id).all()

def get_deal(db: Session, deal_id: str, user_id: uuid.UUID) -> Optional[Deal]:
    return db.query(Deal).filter(Deal.id == deal_id, Deal.user_id == user_id).first()

def create_deal(db: Session, deal_data: DealCreate, user_id: uuid.UUID) -> Deal:
    db_deal = Deal(
        title=deal_data.title,
        value=deal_data.value,
        stage=deal_data.stage,
        contact_name=deal_data.contact_name,
        company=deal_data.company,
        owner=deal_data.owner,
        user_id=user_id
    )
    db.add(db_deal)
    db.commit()
    db.refresh(db_deal)
    return db_deal

def update_deal(db: Session, deal_id: str, deal_data: DealUpdate, user_id: uuid.UUID) -> Optional[Deal]:
    deal = get_deal(db, deal_id, user_id)
    if not deal:
        return None
    for key, value in deal_data.model_dump(exclude_unset=True).items():
        setattr(deal, key, value)
    db.commit()
    db.refresh(deal)
    return deal

def delete_deal(db: Session, deal_id: str, user_id: uuid.UUID) -> bool:
    deal = get_deal(db, deal_id, user_id)
    if not deal:
        return False
    db.delete(deal)
    db.commit()
    return True