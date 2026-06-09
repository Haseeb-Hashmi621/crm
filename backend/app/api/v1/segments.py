from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.segment import SegmentCreate, SegmentUpdate, SegmentResponse
from app.services.segment_service import (
    get_segments, get_segment, create_segment,
    update_segment, delete_segment,
    get_segment_contacts, preview_filters
)
from typing import List
from pydantic import BaseModel
from typing import Optional, Any

router = APIRouter()


class FilterRulePreview(BaseModel):
    field: str
    operator: str
    value: Optional[Any] = None


class PreviewRequest(BaseModel):
    filters: List[FilterRulePreview] = []


@router.get("/", response_model=List[SegmentResponse])
def list_segments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_segments(db, current_user.id)


@router.post("/", response_model=SegmentResponse)
def add_segment(
    data: SegmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_segment(db, data, current_user.id)


@router.get("/{segment_id}", response_model=SegmentResponse)
def get_one_segment(
    segment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    seg = get_segment(db, segment_id, current_user.id)
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    return seg


@router.put("/{segment_id}", response_model=SegmentResponse)
def edit_segment(
    segment_id: str,
    data: SegmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    seg = update_segment(db, segment_id, data, current_user.id)
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    return seg


@router.delete("/{segment_id}")
def remove_segment(
    segment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ok = delete_segment(db, segment_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Segment not found")
    return {"message": "Segment deleted"}


@router.get("/{segment_id}/contacts")
def segment_contacts(
    segment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = get_segment_contacts(db, segment_id, current_user.id)
    if result is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    return result


@router.post("/preview/contacts")
def preview_segment(
    body: PreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Preview matching contacts for a set of filters before saving."""
    contacts = preview_filters(
        db,
        [f.model_dump() for f in body.filters],
        current_user.id
    )
    return {
        "count": len(contacts),
        "contacts": [
            {
                "id": str(c.id),
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "phone": c.phone,
                "company": c.company,
                "tags": [{"id": str(t.id), "name": t.name} for t in (c.tags or [])],
            }
            for c in contacts
        ],
    }