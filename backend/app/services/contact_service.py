from sqlalchemy.orm import Session
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate
from typing import List, Optional

def get_contacts(db: Session, skip: int = 0, limit: int = 100) -> List[Contact]:
    return db.query(Contact).offset(skip).limit(limit).all()

def get_contact(db: Session, contact_id: str) -> Optional[Contact]:
    return db.query(Contact).filter(Contact.id == contact_id).first()

def create_contact(db: Session, contact_data: ContactCreate) -> Contact:
    db_contact = Contact(
        first_name=contact_data.first_name,
        last_name=contact_data.last_name,
        email=contact_data.email,
        phone=contact_data.phone,
        company=contact_data.company
    )
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

def update_contact(db: Session, contact_id: str, contact_data: ContactUpdate) -> Optional[Contact]:
    contact = get_contact(db, contact_id)
    if not contact:
        return None
    for key, value in contact_data.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)
    db.commit()
    db.refresh(contact)
    return contact

def delete_contact(db: Session, contact_id: str) -> bool:
    contact = get_contact(db, contact_id)
    if not contact:
        return False
    db.delete(contact)
    db.commit()
    return True