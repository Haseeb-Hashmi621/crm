from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.tag import TagCreate, TagResponse
from app.services.tag_service import (
    get_tags, create_tag, delete_tag,
    add_tag_to_contact, remove_tag_from_contact
)
from app.schemas.contact import ContactResponse
from typing import List
from uuid import UUID

router = APIRouter()


@router.get("/", response_model=List[TagResponse])
def list_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_tags(db, current_user.id)


@router.post("/", response_model=TagResponse)
def add_tag(
    tag_data: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_tag(db, tag_data, current_user.id)


@router.delete("/{tag_id}")
def remove_tag(
    tag_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = delete_tag(db, tag_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"message": "Tag deleted"}


@router.post("/contacts/{contact_id}/add/{tag_id}", response_model=ContactResponse)
def assign_tag(
    contact_id: UUID,
    tag_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = add_tag_to_contact(db, contact_id, tag_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact or tag not found")
    return contact


@router.delete("/contacts/{contact_id}/remove/{tag_id}", response_model=ContactResponse)
def unassign_tag(
    contact_id: UUID,
    tag_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = remove_tag_from_contact(db, contact_id, tag_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact or tag not found")
    return contact