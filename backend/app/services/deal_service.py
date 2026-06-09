from sqlalchemy.orm import Session
from app.models.deal import Deal
from app.models.contact import Contact
from app.schemas.deal import DealCreate, DealUpdate
from app.services.notification_service import create_notification
from typing import List, Optional
import uuid


def get_deals(db: Session, user_id: uuid.UUID) -> List[Deal]:
    return db.query(Deal).filter(Deal.user_id == user_id).all()


def get_deal(db: Session, deal_id: str, user_id: uuid.UUID) -> Optional[Deal]:
    return db.query(Deal).filter(Deal.id == deal_id, Deal.user_id == user_id).first()


def create_deal(db: Session, deal_data: DealCreate, user_id: uuid.UUID) -> Deal:
    contact_name = deal_data.contact_name

    # If contact_id provided, pull name from contact record
    if deal_data.contact_id:
        contact = db.query(Contact).filter(Contact.id == deal_data.contact_id).first()
        if contact:
            contact_name = f"{contact.first_name or ''} {contact.last_name or ''}".strip()

    db_deal = Deal(
        title=deal_data.title,
        value=deal_data.value,
        stage=deal_data.stage,
        contact_name=contact_name,
        contact_id=deal_data.contact_id,
        company=deal_data.company,
        owner=deal_data.owner,
        user_id=user_id
    )
    db.add(db_deal)
    db.commit()
    db.refresh(db_deal)

    create_notification(
        db, user_id,
        type="deal_added",
        title="New deal created",
        message=f'"{db_deal.title}" added to pipeline',
        link=f"/dashboard/deals/{db_deal.id}"
    )

    return db_deal


def update_deal(db: Session, deal_id: str, deal_data: DealUpdate, user_id: uuid.UUID) -> Optional[Deal]:
    deal = get_deal(db, deal_id, user_id)
    if not deal:
        return None

    old_stage = deal.stage

    # If contact_id is being updated, sync contact_name automatically
    if deal_data.contact_id is not None:
        contact = db.query(Contact).filter(Contact.id == deal_data.contact_id).first()
        if contact:
            deal.contact_name = f"{contact.first_name or ''} {contact.last_name or ''}".strip()
        deal.contact_id = deal_data.contact_id
        # Apply remaining fields except contact_id and contact_name
        for key, value in deal_data.model_dump(exclude_unset=True, exclude={'contact_id', 'contact_name'}).items():
            setattr(deal, key, value)
    else:
        for key, value in deal_data.model_dump(exclude_unset=True).items():
            setattr(deal, key, value)

    db.commit()
    db.refresh(deal)

    if deal_data.stage and deal_data.stage != old_stage:
        stage_labels = {
            "new": "New Lead", "contacted": "Contacted",
            "proposal": "Proposal", "negotiation": "Negotiation",
            "won": "Won", "lost": "Lost"
        }
        create_notification(
            db, user_id,
            type="deal_updated",
            title="Deal stage changed",
            message=f'"{deal.title}" moved to {stage_labels.get(deal.stage, deal.stage)}',
            link=f"/dashboard/deals/{deal.id}"
        )

    return deal


def delete_deal(db: Session, deal_id: str, user_id: uuid.UUID) -> bool:
    deal = get_deal(db, deal_id, user_id)
    if not deal:
        return False
    db.delete(deal)
    db.commit()
    return True