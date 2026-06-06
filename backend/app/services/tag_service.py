from sqlalchemy.orm import Session
from app.models.tag import Tag
from app.models.contact import Contact
from app.schemas.tag import TagCreate
from typing import List, Optional
from uuid import UUID


def get_tags(db: Session, user_id: UUID) -> List[Tag]:
    return db.query(Tag).filter(Tag.user_id == user_id).all()


def create_tag(db: Session, tag_data: TagCreate, user_id: UUID) -> Tag:
    # Check for duplicate name for this user
    existing = db.query(Tag).filter(
        Tag.name == tag_data.name,
        Tag.user_id == user_id
    ).first()
    if existing:
        return existing
    tag = Tag(name=tag_data.name, user_id=user_id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag_id: UUID, user_id: UUID) -> bool:
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user_id).first()
    if not tag:
        return False
    db.delete(tag)
    db.commit()
    return True


def add_tag_to_contact(db: Session, contact_id: UUID, tag_id: UUID) -> Optional[Contact]:
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not contact or not tag:
        return None
    if tag not in contact.tags:
        contact.tags.append(tag)
        db.commit()
        db.refresh(contact)
    return contact


def remove_tag_from_contact(db: Session, contact_id: UUID, tag_id: UUID) -> Optional[Contact]:
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not contact or not tag:
        return None
    if tag in contact.tags:
        contact.tags.remove(tag)
        db.commit()
        db.refresh(contact)
    return contact