from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.activity import Activity
from app.schemas.activity import (
    ActivityCreate, ActivityResponse, ActivityWithContact,
    SentimentAnalysisResponse, AtRiskContactsResponse
)
from app.services.activity_service import (
    get_activities_by_contact, get_activities_by_deal,
    create_activity, delete_activity, get_recent_activities
)
from app.services.sentiment_service import (
    analyze_and_store_activity_sentiment, get_at_risk_contacts
)
from typing import List

router = APIRouter()

@router.get("/count")
def get_activities_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the exact total count of all activities — no cap, no pagination."""
    total = db.query(func.count(Activity.id)).scalar()
    return {"total": total}

# ── Sentiment Analysis (Feature #51) — must come before /{contact_id} ────────

@router.get("/at-risk-contacts", response_model=AtRiskContactsResponse)
def list_at_risk_contacts(
    limit: int = Query(default=10, ge=1, le=50),
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns contacts with the most negative-sentiment activity in the last
    `days` days, for the "at-risk contacts" dashboard widget.
    """
    result = get_at_risk_contacts(db, current_user.id, limit=limit, days=days)
    return AtRiskContactsResponse(**result)

@router.post("/{activity_id}/analyze-sentiment", response_model=SentimentAnalysisResponse)
def analyze_activity_sentiment(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually (re)runs sentiment analysis on any single activity — useful for
    call/meeting/note entries typed by an agent, not just inbound messages
    which are analyzed automatically by the webhook.
    """
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    result = analyze_and_store_activity_sentiment(db, activity)
    return SentimentAnalysisResponse(**result)

@router.get("/contact/{contact_id}", response_model=List[ActivityResponse])
def list_contact_activities(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_activities_by_contact(db, contact_id)

@router.get("/deal/{deal_id}", response_model=List[ActivityResponse])
def list_deal_activities(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_activities_by_deal(db, deal_id)

@router.get("/recent", response_model=List[ActivityWithContact])
def list_recent_activities(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns recent activities across all contacts in a single DB query."""
    return get_recent_activities(db, limit=limit)

# Keep old route as alias so ContactDetail.jsx doesn't break
@router.get("/{contact_id}", response_model=List[ActivityResponse])
def list_activities_legacy(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_activities_by_contact(db, contact_id)

@router.post("/", response_model=ActivityResponse)
def add_activity(
    activity_data: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_activity(db, activity_data)

@router.delete("/{activity_id}")
def remove_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_activity(db, activity_id)
    if not success:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"message": "Activity deleted"}