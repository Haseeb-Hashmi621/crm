from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class DealCreate(BaseModel):
    title: str
    value: Optional[float] = 0
    stage: Optional[str] = "new"
    contact_id: Optional[UUID] = None
    contact_name: Optional[str] = None
    company: Optional[str] = None
    owner: Optional[str] = None


class DealUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[float] = None
    stage: Optional[str] = None
    contact_id: Optional[UUID] = None
    contact_name: Optional[str] = None
    company: Optional[str] = None
    owner: Optional[str] = None


class DealResponse(BaseModel):
    id: UUID
    title: str
    value: float
    stage: str
    contact_id: Optional[UUID] = None
    contact_name: Optional[str] = None
    company: Optional[str] = None
    owner: Optional[str] = None
    ai_score: Optional[int] = None
    ai_score_reasoning: Optional[str] = None
    ai_score_factors: Optional[List[dict]] = None
    ai_scored_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DealScoreResponse(BaseModel):
    deal_id: UUID
    ai_score: int
    ai_score_reasoning: str
    ai_score_factors: List[dict]
    ai_scored_at: datetime


class BulkScoreResponse(BaseModel):
    scored: int
    failed: int
    total: int