from sqlalchemy.orm import Session
from app.models.chatbot import KnowledgeBaseEntry
from app.schemas.knowledge_base import KnowledgeBaseEntryCreate, KnowledgeBaseEntryUpdate
from typing import List, Optional
import uuid


def get_entries(db: Session, user_id: uuid.UUID) -> List[KnowledgeBaseEntry]:
    return db.query(KnowledgeBaseEntry).filter(
        KnowledgeBaseEntry.user_id == user_id
    ).order_by(
        KnowledgeBaseEntry.category.asc().nullslast(),
        KnowledgeBaseEntry.created_at.desc()
    ).all()


def get_entry(db: Session, entry_id: str, user_id: uuid.UUID) -> Optional[KnowledgeBaseEntry]:
    return db.query(KnowledgeBaseEntry).filter(
        KnowledgeBaseEntry.id == entry_id,
        KnowledgeBaseEntry.user_id == user_id
    ).first()


def create_entry(db: Session, data: KnowledgeBaseEntryCreate, user_id: uuid.UUID) -> KnowledgeBaseEntry:
    entry = KnowledgeBaseEntry(
        user_id=user_id,
        title=data.title,
        content=data.content,
        category=data.category,
        is_active=data.is_active,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_entry(
    db: Session, entry_id: str, data: KnowledgeBaseEntryUpdate, user_id: uuid.UUID
) -> Optional[KnowledgeBaseEntry]:
    entry = get_entry(db, entry_id, user_id)
    if not entry:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_entry(db: Session, entry_id: str, user_id: uuid.UUID) -> bool:
    entry = get_entry(db, entry_id, user_id)
    if not entry:
        return False
    db.delete(entry)
    db.commit()
    return True