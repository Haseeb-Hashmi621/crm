"""
Adds three analytics endpoints:
  GET /deals/analytics/funnel     — stage counts/values + conversion %
  GET /deals/analytics/velocity   — avg days spent per stage
  GET /deals/analytics/by-owner   — performance grouped by owner
  GET /deals/analytics/forecast   — AI-powered 30/60/90-day revenue forecast (Feature #52)

Feature #50 — AI Deal Scoring:
  POST /deals/{deal_id}/score     — score a single deal
  POST /deals/score-all           — bulk-score every open deal
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.deal import Deal
from app.models.deal_stage_history import DealStageHistory
from app.schemas.deal import DealCreate, DealUpdate, DealResponse, DealScoreResponse, BulkScoreResponse
from app.services.deal_service import get_deals, get_deal, create_deal, update_deal, delete_deal
from app.services.ai_deal_scoring_service import score_deal, score_all_open_deals
from app.services.forecast_service import generate_forecast
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from collections import defaultdict

router = APIRouter()

STAGE_ORDER = ["new", "contacted", "proposal", "negotiation", "won"]
STAGE_LABELS = {
    "new": "New Lead", "contacted": "Contacted", "proposal": "Proposal",
    "negotiation": "Negotiation", "won": "Won", "lost": "Lost",
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class FunnelStage(BaseModel):
    stage: str
    label: str
    count: int
    value: float
    conversion_from_previous: Optional[float] = None
    conversion_from_start: Optional[float] = None


class FunnelResponse(BaseModel):
    stages: List[FunnelStage]
    total_deals: int
    overall_win_rate: float
    lost_count: int
    lost_value: float


class VelocityStage(BaseModel):
    stage: str
    label: str
    avg_days: float
    deal_count: int


class VelocityResponse(BaseModel):
    stages: List[VelocityStage]


class OwnerPerformance(BaseModel):
    owner: str
    total_deals: int
    won_deals: int
    lost_deals: int
    open_deals: int
    win_rate: float
    total_value: float
    won_value: float
    avg_deal_value: float


class OwnerPerformanceResponse(BaseModel):
    owners: List[OwnerPerformance]


class MonthlyWonRevenue(BaseModel):
    month: str
    won_value: float


class RevenueForecastResponse(BaseModel):
    generated_at: datetime
    open_deal_count: int
    total_pipeline_value: float
    pipeline_weighted_value: float
    forecast_30_day: float
    forecast_60_day: float
    forecast_90_day: float
    historical_monthly_won: List[MonthlyWonRevenue]
    confidence: str
    narrative: str
    assumptions: List[str]


# ── Existing CRUD endpoints ────────────────────────────────────────────────────

@router.get("/count")
def get_deals_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the exact total count of all deals — no cap, no pagination."""
    total = db.query(func.count(Deal.id)).filter(
        Deal.user_id == current_user.id
    ).scalar()
    return {"total": total}


# ── Analytics endpoints — must come BEFORE /{deal_id} ─────────────────────────

@router.get("/analytics/funnel", response_model=FunnelResponse)
def get_funnel_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deals = db.query(Deal).filter(Deal.user_id == current_user.id).all()
    total_deals = len(deals)

    if total_deals == 0:
        return FunnelResponse(stages=[], total_deals=0, overall_win_rate=0, lost_count=0, lost_value=0)

    counts = {s: 0 for s in STAGE_ORDER}
    values = {s: 0.0 for s in STAGE_ORDER}
    lost_count = 0
    lost_value = 0.0

    for d in deals:
        if d.stage == "lost":
            lost_count += 1
            lost_value += d.value or 0
        elif d.stage in counts:
            counts[d.stage] += d.value and 1 or 1
            values[d.stage] += d.value or 0

    history_rows = db.query(DealStageHistory.deal_id, DealStageHistory.to_stage).filter(
        DealStageHistory.user_id == current_user.id
    ).all()

    reached_stage = defaultdict(set)
    for deal_id, to_stage in history_rows:
        if to_stage in counts:
            reached_stage[to_stage].add(deal_id)

    stages: List[FunnelStage] = []
    new_lead_count = len(reached_stage.get("new", set())) or total_deals

    for i, stage in enumerate(STAGE_ORDER):
        reached = len(reached_stage.get(stage, set()))
        stage_value = values[stage]

        conversion_from_start = round((reached / new_lead_count) * 100, 1) if new_lead_count > 0 else 0

        conversion_from_previous = None
        if i > 0:
            prev_stage = STAGE_ORDER[i - 1]
            prev_reached = len(reached_stage.get(prev_stage, set()))
            conversion_from_previous = round((reached / prev_reached) * 100, 1) if prev_reached > 0 else 0

        stages.append(FunnelStage(
            stage=stage,
            label=STAGE_LABELS[stage],
            count=counts[stage],
            value=stage_value,
            conversion_from_previous=conversion_from_previous,
            conversion_from_start=conversion_from_start,
        ))

    won_count = counts.get("won", 0)
    overall_win_rate = round((won_count / total_deals) * 100, 1) if total_deals > 0 else 0

    return FunnelResponse(
        stages=stages,
        total_deals=total_deals,
        overall_win_rate=overall_win_rate,
        lost_count=lost_count,
        lost_value=lost_value,
    )


@router.get("/analytics/velocity", response_model=VelocityResponse)
def get_velocity_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = db.query(DealStageHistory).filter(
        DealStageHistory.user_id == current_user.id
    ).order_by(DealStageHistory.deal_id, DealStageHistory.entered_at.asc()).all()

    by_deal = defaultdict(list)
    for h in history:
        by_deal[h.deal_id].append(h)

    durations = defaultdict(list)

    for deal_id, events in by_deal.items():
        for i in range(len(events) - 1):
            stage = events[i].to_stage
            if stage not in STAGE_ORDER:
                continue
            start = events[i].entered_at
            end = events[i + 1].entered_at
            if start and end:
                delta_days = (end - start).total_seconds() / 86400
                if delta_days >= 0:
                    durations[stage].append(delta_days)
        last = events[-1]
        if last.to_stage in STAGE_ORDER and last.to_stage not in ("won", "lost"):
            now = datetime.now(last.entered_at.tzinfo) if last.entered_at.tzinfo else datetime.utcnow()
            delta_days = (now - last.entered_at).total_seconds() / 86400
            if delta_days >= 0:
                durations[last.to_stage].append(delta_days)

    stages = []
    for stage in STAGE_ORDER:
        vals = durations.get(stage, [])
        avg = round(sum(vals) / len(vals), 1) if vals else 0
        stages.append(VelocityStage(
            stage=stage,
            label=STAGE_LABELS[stage],
            avg_days=avg,
            deal_count=len(vals),
        ))

    return VelocityResponse(stages=stages)


@router.get("/analytics/by-owner", response_model=OwnerPerformanceResponse)
def get_owner_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deals = db.query(Deal).filter(Deal.user_id == current_user.id).all()

    grouped = defaultdict(list)
    for d in deals:
        owner_name = d.owner or "Unassigned"
        grouped[owner_name].append(d)

    owners = []
    for owner_name, owner_deals in grouped.items():
        won = [d for d in owner_deals if d.stage == "won"]
        lost = [d for d in owner_deals if d.stage == "lost"]
        open_deals = [d for d in owner_deals if d.stage not in ("won", "lost")]

        total_value = sum(d.value or 0 for d in owner_deals)
        won_value = sum(d.value or 0 for d in won)
        win_rate = round((len(won) / len(owner_deals)) * 100, 1) if owner_deals else 0
        avg_value = round(total_value / len(owner_deals), 2) if owner_deals else 0

        owners.append(OwnerPerformance(
            owner=owner_name,
            total_deals=len(owner_deals),
            won_deals=len(won),
            lost_deals=len(lost),
            open_deals=len(open_deals),
            win_rate=win_rate,
            total_value=total_value,
            won_value=won_value,
            avg_deal_value=avg_value,
        ))

    owners.sort(key=lambda o: o.won_value, reverse=True)

    return OwnerPerformanceResponse(owners=owners)


@router.get("/analytics/forecast", response_model=RevenueForecastResponse)
def get_revenue_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Feature #52 — AI-Powered Revenue Forecasting.
    Computes deterministic 30/60/90-day pipeline-weighted revenue projections
    from current open deals (using AI Deal Scores where available, falling
    back to historical stage-conversion rates), then asks Groq for a plain-
    English narrative and confidence label on top of those computed numbers.
    """
    result = generate_forecast(db, current_user.id)
    return RevenueForecastResponse(**result)


# ── AI Deal Scoring — Feature #50 ──────────────────────────────────────────────
# Must come before /{deal_id} since "score-all" would otherwise be captured
# as a deal_id path parameter.

@router.post("/score-all", response_model=BulkScoreResponse)
def bulk_score_deals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Score every open (not won/lost) deal for the current user in one pass."""
    result = score_all_open_deals(db, current_user.id)
    return BulkScoreResponse(**result)


# ── Existing CRUD endpoints (continued) ────────────────────────────────────────

@router.get("/", response_model=List[DealResponse])
def list_deals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_deals(db, current_user.id)


@router.post("/", response_model=DealResponse)
def add_deal(
    deal_data: DealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_deal(db, deal_data, current_user.id)


@router.get("/{deal_id}", response_model=DealResponse)
def get_one_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deal = get_deal(db, deal_id, current_user.id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal


@router.put("/{deal_id}", response_model=DealResponse)
def edit_deal(
    deal_id: str,
    deal_data: DealUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deal = update_deal(db, deal_id, deal_data, current_user.id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal


@router.delete("/{deal_id}")
def remove_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_deal(db, deal_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Deal deleted successfully"}


@router.post("/{deal_id}/score", response_model=DealScoreResponse)
def score_one_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compute (or refresh) the AI win-likelihood score for a single deal."""
    deal = get_deal(db, deal_id, current_user.id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    result = score_deal(db, deal)
    return DealScoreResponse(**result)