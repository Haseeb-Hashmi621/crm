from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.schemas.knowledge_base import (
    KnowledgeBaseEntryCreate, KnowledgeBaseEntryUpdate, KnowledgeBaseEntryResponse
)
from app.services.knowledge_base_service import (
    get_entries, get_entry, create_entry, update_entry, delete_entry
)
from typing import List

router = APIRouter()


@router.get("/", response_model=List[KnowledgeBaseEntryResponse])
def list_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return get_entries(db, current_user.id)


@router.post("/", response_model=KnowledgeBaseEntryResponse)
def add_entry(
    data: KnowledgeBaseEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return create_entry(db, data, current_user.id)


@router.get("/{entry_id}", response_model=KnowledgeBaseEntryResponse)
def get_one_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    entry = get_entry(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge base entry not found")
    return entry


@router.patch("/{entry_id}", response_model=KnowledgeBaseEntryResponse)
def edit_entry(
    entry_id: str,
    data: KnowledgeBaseEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    entry = update_entry(db, entry_id, data, current_user.id)
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge base entry not found")
    return entry


@router.delete("/{entry_id}")
def remove_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    success = delete_entry(db, entry_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Knowledge base entry not found")
    return {"message": "Knowledge base entry deleted"}