from sqlalchemy.orm import Session, joinedload
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate
from app.services.notification_service import create_notification
from typing import List, Optional

def get_contacts(db: Session, skip: int = 0, limit: int = 100, user_id: str = None) -> List[Contact]:
    query = db.query(Contact).options(joinedload(Contact.tags))
    if user_id:
        query = query.filter(Contact.user_id == user_id)
    return query.offset(skip).limit(limit).all()

def get_contact(db: Session, contact_id: str, user_id: str = None) -> Optional[Contact]:
    query = db.query(Contact).options(joinedload(Contact.tags)).filter(Contact.id == contact_id)
    if user_id:
        query = query.filter(Contact.user_id == user_id)
    return query.first()

def create_contact(db: Session, contact_data: ContactCreate, user_id: str) -> Contact:
    db_contact = Contact(
        first_name=contact_data.first_name,
        last_name=contact_data.last_name,
        email=contact_data.email,
        phone=contact_data.phone,
        company=contact_data.company,
        user_id=user_id
    )
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)

    full_name = f"{db_contact.first_name or ''} {db_contact.last_name or ''}".strip()
    create_notification(
        db, user_id,
        type="contact_added",
        title="New contact added",
        message=f"{full_name} was added to your contacts",
        link=f"/dashboard/contacts/{db_contact.id}"
    )

    return db_contact

def update_contact(db: Session, contact_id: str, contact_data: ContactUpdate, user_id: str = None) -> Optional[Contact]:
    contact = get_contact(db, contact_id, user_id)
    if not contact:
        return None
    for key, value in contact_data.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)
    db.commit()
    return get_contact(db, contact_id, user_id)

def delete_contact(db: Session, contact_id: str, user_id: str = None) -> bool:
    contact = get_contact(db, contact_id, user_id)
    if not contact:
        return False
    db.delete(contact)
    db.commit()
    return True