from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class ActivityCreate(BaseModel):
    contact_id: UUID
    deal_id: Optional[UUID] = None
    type: Optional[str] = "note"
    content: str

class ActivityResponse(BaseModel):
    id: UUID
    contact_id: UUID
    deal_id: Optional[UUID] = None
    type: str
    content: str
    created_at: datetime
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_analyzed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ActivityContactInfo(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    class Config:
        from_attributes = True

class ActivityWithContact(BaseModel):
    id: UUID
    contact_id: UUID
    deal_id: Optional[UUID] = None
    type: str
    content: str
    created_at: datetime
    contact: ActivityContactInfo
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_analyzed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Sentiment Analysis (Feature #51) ─────────────────────────────────────────

class SentimentAnalysisResponse(BaseModel):
    activity_id: UUID
    sentiment: str
    sentiment_score: float
    sentiment_analyzed_at: datetime


class AtRiskContact(BaseModel):
    contact_id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    negative_count: int
    avg_sentiment_score: float
    most_recent_negative_content: Optional[str] = None
    most_recent_negative_at: Optional[datetime] = None


class AtRiskContactsResponse(BaseModel):
    contacts: List[AtRiskContact]
    total_negative_activities: int