from sqlalchemy.orm import Session
from app.models.tag import Tag
from app.models.contact import Contact
from app.schemas.tag import TagCreate
from typing import List, Optional

def get_tags(db: Session, user_id: str) -> List[Tag]:
    return db.query(Tag).filter(Tag.user_id == user_id).all()

def create_tag(db: Session, data: TagCreate, user_id: str) -> Tag:
    # Don't create duplicate tag names for same user
    existing = db.query(Tag).filter(
        Tag.user_id == user_id,
        Tag.name == data.name.strip()
    ).first()
    if existing:
        return existing
    tag = Tag(name=data.name.strip(), user_id=user_id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag

def delete_tag(db: Session, tag_id: str, user_id: str) -> bool:
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user_id).first()
    if not tag:
        return False
    db.delete(tag)
    db.commit()
    return True

def add_tag_to_contact(db: Session, contact_id: str, tag_id: str, user_id: str) -> Optional[Contact]:
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.user_id == user_id
    ).first()
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user_id).first()
    if not contact or not tag:
        return None
    if tag not in contact.tags:
        contact.tags.append(tag)
        db.commit()
        db.refresh(contact)
    return contact

def remove_tag_from_contact(db: Session, contact_id: str, tag_id: str, user_id: str) -> Optional[Contact]:
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.user_id == user_id
    ).first()
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user_id).first()
    if not contact or not tag:
        return None
    if tag in contact.tags:
        contact.tags.remove(tag)
        db.commit()
        db.refresh(contact)
    return contact