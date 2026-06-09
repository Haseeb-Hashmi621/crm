from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.email_template import EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse
from app.services.email_template_service import (
    get_templates, get_template, create_template,
    update_template, delete_template, duplicate_template
)
from typing import List

router = APIRouter()


@router.get("/", response_model=List[EmailTemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_templates(db, current_user.id)


@router.post("/", response_model=EmailTemplateResponse)
def add_template(
    data: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_template(db, data, current_user.id)


@router.get("/{template_id}", response_model=EmailTemplateResponse)
def get_one_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = get_template(db, template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/{template_id}", response_model=EmailTemplateResponse)
def edit_template(
    template_id: str,
    data: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = update_template(db, template_id, data, current_user.id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.delete("/{template_id}")
def remove_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_template(db, template_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}


@router.post("/{template_id}/duplicate", response_model=EmailTemplateResponse)
def copy_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = duplicate_template(db, template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template