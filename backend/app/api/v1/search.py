from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.campaign import Campaign
from typing import List
from pydantic import BaseModel
from uuid import UUID
from typing import Optional

router = APIRouter()


class SearchResult(BaseModel):
    id: UUID
    type: str          # "contact" | "deal" | "campaign"
    title: str
    subtitle: Optional[str] = None
    meta: Optional[str] = None   # e.g. deal stage, campaign status

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[SearchResult]


@router.get("/", response_model=SearchResponse)
def global_search(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q_lower = q.strip().lower()
    results: List[SearchResult] = []

    # ── Contacts ──────────────────────────────────────────────────────────────
    contacts = (
        db.query(Contact)
        .filter(
            Contact.user_id == current_user.id,
            or_(
                func.lower(Contact.first_name).contains(q_lower),
                func.lower(Contact.last_name).contains(q_lower),
                func.lower(Contact.email).contains(q_lower),
                func.lower(Contact.company).contains(q_lower),
                func.lower(Contact.phone).contains(q_lower),
            )
        )
        .limit(limit)
        .all()
    )

    for c in contacts:
        full_name = f"{c.first_name or ''} {c.last_name or ''}".strip()
        results.append(SearchResult(
            id=c.id,
            type="contact",
            title=full_name or c.email or "Unnamed Contact",
            subtitle=c.email,
            meta=c.company,
        ))

    # ── Deals ─────────────────────────────────────────────────────────────────
    deals = (
        db.query(Deal)
        .filter(
            Deal.user_id == current_user.id,
            or_(
                func.lower(Deal.title).contains(q_lower),
                func.lower(Deal.contact_name).contains(q_lower),
                func.lower(Deal.company).contains(q_lower),
            )
        )
        .limit(limit)
        .all()
    )

    STAGE_LABELS = {
        "new": "New Lead", "contacted": "Contacted", "proposal": "Proposal",
        "negotiation": "Negotiation", "won": "Won", "lost": "Lost",
    }

    for d in deals:
        results.append(SearchResult(
            id=d.id,
            type="deal",
            title=d.title,
            subtitle=f"${d.value:,.0f}" if d.value else None,
            meta=STAGE_LABELS.get(d.stage, d.stage),
        ))

    # ── Campaigns ─────────────────────────────────────────────────────────────
    campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.user_id == current_user.id,
            or_(
                func.lower(Campaign.name).contains(q_lower),
                func.lower(Campaign.subject).contains(q_lower),
            )
        )
        .limit(limit)
        .all()
    )

    for camp in campaigns:
        results.append(SearchResult(
            id=camp.id,
            type="campaign",
            title=camp.name,
            subtitle=camp.subject,
            meta=camp.status.capitalize(),
        ))

    return SearchResponse(
        query=q,
        total=len(results),
        results=results,
    )