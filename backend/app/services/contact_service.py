from sqlalchemy.orm import Session
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate
from typing import List, Optional
import uuid

def get_contacts(db: Session, user_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[Contact]:
    return db.query(Contact).filter(Contact.user_id == user_id).offset(skip).limit(limit).all()

def get_contact(db: Session, contact_id: str, user_id: uuid.UUID) -> Optional[Contact]:
    return db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == user_id).first()

def create_contact(db: Session, contact_data: ContactCreate, user_id: uuid.UUID) -> Contact:
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
    return db_contact

def update_contact(db: Session, contact_id: str, contact_data: ContactUpdate, user_id: uuid.UUID) -> Optional[Contact]:
    contact = get_contact(db, contact_id, user_id)
    if not contact:
        return None
    for key, value in contact_data.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)
    db.commit()
    db.refresh(contact)
    return contact

def delete_contact(db: Session, contact_id: str, user_id: uuid.UUID) -> bool:
    contact = get_contact(db, contact_id, user_id)
    if not contact:
        return False
    db.delete(contact)
    db.commit()
    return True