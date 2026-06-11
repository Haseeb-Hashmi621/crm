from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_, func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.activity import Activity
from app.models.contact import Contact
from app.models.deal import Deal
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

router = APIRouter()


class InboxContactInfo(BaseModel):
    id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class InboxDealInfo(BaseModel):
    id: UUID
    title: str

    class Config:
        from_attributes = True


class InboxItem(BaseModel):
    id: UUID
    type: str
    content: str
    created_at: datetime
    contact_id: UUID
    deal_id: Optional[UUID] = None
    contact: Optional[InboxContactInfo] = None
    deal: Optional[InboxDealInfo] = None

    class Config:
        from_attributes = True


class InboxResponse(BaseModel):
    items: List[InboxItem]
    total: int
    page: int
    page_size: int
    has_more: bool


@router.get("/", response_model=InboxResponse)
def get_inbox(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type_filter: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = Query(None),
    contact_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aggregate all activities for the current user across all contacts,
    with optional filtering by type, search text, and contact.
    """
    # Get all contact IDs belonging to this user
    user_contact_ids = db.query(Contact.id).filter(
        Contact.user_id == current_user.id
    ).subquery()

    # Base query — activities whose contact belongs to current user
    query = db.query(Activity).filter(
        Activity.contact_id.in_(user_contact_ids)
    )

    # Type filter
    if type_filter and type_filter != "all":
        query = query.filter(Activity.type == type_filter)

    # Contact filter
    if contact_id:
        query = query.filter(Activity.contact_id == contact_id)

    # Search filter — search in content
    if search and search.strip():
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(Activity.content).like(s)
        )

    # Total count
    total = query.count()

    # Paginate, newest first
    offset = (page - 1) * page_size
    activities = (
        query
        .order_by(desc(Activity.created_at))
        .offset(offset)
        .limit(page_size)
        .all()
    )

    # Enrich with contact + deal info
    contact_ids = list({a.contact_id for a in activities})
    deal_ids = list({a.deal_id for a in activities if a.deal_id})

    contacts_map = {}
    if contact_ids:
        contacts = db.query(Contact).filter(Contact.id.in_(contact_ids)).all()
        contacts_map = {str(c.id): c for c in contacts}

    deals_map = {}
    if deal_ids:
        deals = db.query(Deal).filter(Deal.id.in_(deal_ids)).all()
        deals_map = {str(d.id): d for d in deals}

    items = []
    for a in activities:
        contact = contacts_map.get(str(a.contact_id))
        deal = deals_map.get(str(a.deal_id)) if a.deal_id else None
        items.append(InboxItem(
            id=a.id,
            type=a.type or "note",
            content=a.content,
            created_at=a.created_at,
            contact_id=a.contact_id,
            deal_id=a.deal_id,
            contact=InboxContactInfo(
                id=contact.id,
                first_name=contact.first_name,
                last_name=contact.last_name,
                company=contact.company,
                email=contact.email,
            ) if contact else None,
            deal=InboxDealInfo(
                id=deal.id,
                title=deal.title,
            ) if deal else None,
        ))

    return InboxResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + page_size) < total,
    )


@router.get("/stats")
def get_inbox_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return counts per activity type for the current user."""
    user_contact_ids = db.query(Contact.id).filter(
        Contact.user_id == current_user.id
    ).subquery()

    rows = (
        db.query(Activity.type, func.count(Activity.id))
        .filter(Activity.contact_id.in_(user_contact_ids))
        .group_by(Activity.type)
        .all()
    )

    counts = {"all": 0, "note": 0, "call": 0, "email": 0, "meeting": 0}
    for activity_type, count in rows:
        key = activity_type or "note"
        counts[key] = count
        counts["all"] += count

    return counts