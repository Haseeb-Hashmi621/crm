from sqlalchemy.orm import Session
from app.models.email_template import EmailTemplate
from app.schemas.email_template import EmailTemplateCreate, EmailTemplateUpdate
from typing import List, Optional
import uuid


def get_templates(db: Session, user_id: uuid.UUID) -> List[EmailTemplate]:
    return db.query(EmailTemplate).filter(
        EmailTemplate.user_id == user_id
    ).order_by(EmailTemplate.created_at.desc()).all()


def get_template(db: Session, template_id: str, user_id: uuid.UUID) -> Optional[EmailTemplate]:
    return db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.user_id == user_id
    ).first()


def create_template(db: Session, data: EmailTemplateCreate, user_id: uuid.UUID) -> EmailTemplate:
    template = EmailTemplate(
        user_id=user_id,
        name=data.name,
        subject=data.subject,
        body=data.body,
        category=data.category or "general"
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def update_template(
    db: Session, template_id: str, data: EmailTemplateUpdate, user_id: uuid.UUID
) -> Optional[EmailTemplate]:
    template = get_template(db, template_id, user_id)
    if not template:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(template, key, value)
    db.commit()
    db.refresh(template)
    return template


def delete_template(db: Session, template_id: str, user_id: uuid.UUID) -> bool:
    template = get_template(db, template_id, user_id)
    if not template:
        return False
    db.delete(template)
    db.commit()
    return True


def duplicate_template(db: Session, template_id: str, user_id: uuid.UUID) -> Optional[EmailTemplate]:
    original = get_template(db, template_id, user_id)
    if not original:
        return None
    copy = EmailTemplate(
        user_id=user_id,
        name=f"{original.name} (Copy)",
        subject=original.subject,
        body=original.body,
        category=original.category
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy