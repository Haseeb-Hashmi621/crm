"""
backend/app/services/forecast_service.py

Feature #52 — AI-Powered Revenue Forecasting.

Design principle: the DOLLAR FIGURES are computed deterministically from real
pipeline data (never hallucinated by the model). Groq is only used to write
the narrative summary and assign a confidence label given the already-computed
numbers — this keeps the money-critical math auditable and repeatable.

Methodology:
  1. Pull every open (not won/lost) deal for the user.
  2. For each deal, estimate win probability:
     - If the deal has an AI Deal Score (Feature #50), use that directly.
     - Otherwise fall back to a historical stage->won conversion rate
       computed from DealStageHistory (same technique as /deals/analytics/funnel).
  3. Estimate expected days-to-close remaining, using average stage velocity
     data (same technique as /deals/analytics/velocity) summed across all
     stages between the deal's current stage and "won".
  4. For each forecast window (30/60/90 days), scale each deal's probability
     down if its expected remaining time exceeds the window (a deal unlikely
     to close within 30 days shouldn't contribute its full value to the
     30-day figure).
  5. Sum weighted values per window = the forecast.
  6. Feed the computed numbers + historical monthly won-revenue trend to
     Groq for a plain-English narrative and a confidence label.
"""
import json
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import groq
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.deal import Deal
from app.models.deal_stage_history import DealStageHistory

STAGE_ORDER = ["new", "contacted", "proposal", "negotiation", "won"]
STAGE_LABELS = {
    "new": "New Lead", "contacted": "Contacted", "proposal": "Proposal",
    "negotiation": "Negotiation", "won": "Won", "lost": "Lost",
}

SYSTEM_PROMPT = """\
You are a revenue operations analyst. You are given a set of ALREADY-COMPUTED pipeline \
forecast figures for a sales team (30/60/90 day projections, historical monthly won revenue, \
and pipeline composition). Do NOT invent or alter any numbers — treat the provided figures as \
ground truth and only comment on them.

Return ONLY valid JSON, no markdown, no commentary, in this exact format:
{
  "narrative": "2-4 sentence plain-English summary of the outlook and what's driving it",
  "confidence": "low",
  "assumptions": ["short bullet 1", "short bullet 2", "short bullet 3"]
}

Rules:
- "confidence" must be exactly one of: "low", "medium", "high"
- Base confidence on: how much historical won-deal data exists, how concentrated the
  pipeline value is in a few large deals (concentration = lower confidence), and whether
  many deals lack an AI score or contact activity (less signal = lower confidence)
- "assumptions" should be 2-4 short bullets explaining the methodology in plain language,
  e.g. "Assumes deals without a score close at the historical rate for their stage" """


def _get_client() -> groq.Groq:
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured")
    return groq.Groq(api_key=settings.GROQ_API_KEY)


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def _compute_stage_conversion_rates(db: Session, user_id) -> dict:
    """Same technique as /deals/analytics/funnel — reached[stage] / reached[previous]."""
    history_rows = db.query(DealStageHistory.deal_id, DealStageHistory.to_stage).filter(
        DealStageHistory.user_id == user_id
    ).all()

    reached_stage = defaultdict(set)
    for deal_id, to_stage in history_rows:
        if to_stage in STAGE_ORDER:
            reached_stage[to_stage].add(deal_id)

    # probability of reaching "won" FROM each stage
    # = reached[won] / reached[stage], walking forward through the funnel
    won_count = len(reached_stage.get("won", set()))
    rates = {}
    for stage in STAGE_ORDER:
        reached = len(reached_stage.get(stage, set()))
        rates[stage] = round(won_count / reached, 3) if reached > 0 else 0.15  # fallback baseline
    rates["won"] = 1.0
    return rates


def _compute_stage_velocity(db: Session, user_id) -> dict:
    """Same technique as /deals/analytics/velocity — avg days spent in each stage."""
    history = db.query(DealStageHistory).filter(
        DealStageHistory.user_id == user_id
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

    avg_days = {}
    for stage in STAGE_ORDER:
        vals = durations.get(stage, [])
        avg_days[stage] = round(sum(vals) / len(vals), 1) if vals else 7.0  # fallback baseline
    return avg_days


def _expected_remaining_days(deal: Deal, avg_velocity: dict, last_stage_entered_at) -> float:
    """
    Estimated days remaining until this deal would reach 'won', combining:
    - time already spent in the current stage (subtracted from that stage's average)
    - full average duration of every stage after the current one
    """
    if deal.stage not in STAGE_ORDER:
        return 999.0  # e.g. lost, or unknown — effectively "not closing"

    idx = STAGE_ORDER.index(deal.stage)
    remaining_stages = STAGE_ORDER[idx:-1]  # exclude "won" itself, up to but not incl.

    now = datetime.now(timezone.utc)
    time_in_current_stage = 0.0
    if last_stage_entered_at:
        entered = last_stage_entered_at
        if entered.tzinfo is None:
            entered = entered.replace(tzinfo=timezone.utc)
        time_in_current_stage = max(0.0, (now - entered).total_seconds() / 86400)

    current_stage_avg = avg_velocity.get(deal.stage, 7.0)
    remaining_in_current = max(0.5, current_stage_avg - time_in_current_stage)

    remaining_future_stages = sum(
        avg_velocity.get(s, 7.0) for s in remaining_stages[1:]
    )

    return remaining_in_current + remaining_future_stages


def _deal_probability(deal: Deal, stage_rates: dict) -> float:
    """Prefer the AI Deal Score (Feature #50) if present; else historical stage rate."""
    if deal.ai_score is not None:
        return max(0.0, min(1.0, deal.ai_score / 100.0))
    return stage_rates.get(deal.stage, 0.15)


def _historical_monthly_won(db: Session, user_id, months: int = 6) -> list:
    """Sums won-deal value by calendar month for the last `months` months, using the
    entered_at timestamp of the stage-history row where to_stage == 'won'."""
    since = datetime.now(timezone.utc) - timedelta(days=months * 31)

    rows = (
        db.query(DealStageHistory, Deal.value)
        .join(Deal, Deal.id == DealStageHistory.deal_id)
        .filter(
            DealStageHistory.user_id == user_id,
            DealStageHistory.to_stage == "won",
            DealStageHistory.entered_at >= since,
        )
        .all()
    )

    by_month = defaultdict(float)
    for history_row, value in rows:
        if not history_row.entered_at:
            continue
        key = history_row.entered_at.strftime("%Y-%m")
        by_month[key] += value or 0

    sorted_months = sorted(by_month.keys())
    return [{"month": m, "won_value": round(by_month[m], 2)} for m in sorted_months]


def generate_forecast(db: Session, user_id) -> dict:
    open_deals = (
        db.query(Deal)
        .filter(Deal.user_id == user_id, Deal.stage.notin_(["won", "lost"]))
        .all()
    )

    stage_rates = _compute_stage_conversion_rates(db, user_id)
    avg_velocity = _compute_stage_velocity(db, user_id)

    # Pull each open deal's most recent stage-history entry for "time in stage"
    last_entries = {}
    if open_deals:
        deal_ids = [d.id for d in open_deals]
        rows = (
            db.query(DealStageHistory)
            .filter(DealStageHistory.deal_id.in_(deal_ids))
            .order_by(DealStageHistory.deal_id, DealStageHistory.entered_at.desc())
            .all()
        )
        for row in rows:
            if row.deal_id not in last_entries:
                last_entries[row.deal_id] = row

    windows = {30: 0.0, 60: 0.0, 90: 0.0}
    pipeline_weighted_value = 0.0
    total_pipeline_value = sum(d.value or 0 for d in open_deals)
    scored_deal_count = sum(1 for d in open_deals if d.ai_score is not None)

    for deal in open_deals:
        probability = _deal_probability(deal, stage_rates)
        last_entry = last_entries.get(deal.id)
        last_entered_at = last_entry.entered_at if last_entry else deal.created_at

        remaining_days = _expected_remaining_days(deal, avg_velocity, last_entered_at)
        value = deal.value or 0

        pipeline_weighted_value += value * probability

        for window_days in windows:
            if remaining_days <= window_days:
                time_factor = 1.0
            else:
                # Partial credit tapering to 0 as remaining_days grows well past the window
                time_factor = max(0.0, 1.0 - (remaining_days - window_days) / window_days)
            windows[window_days] += value * probability * time_factor

    historical = _historical_monthly_won(db, user_id)

    # ── Narrative via Groq (numbers are already final at this point) ────────────
    narrative = "Forecast generated from current pipeline data."
    confidence = "medium"
    assumptions = [
        "Deals with an AI Deal Score use that score as their win probability; others use historical stage conversion rates.",
        "Expected time-to-close is based on this team's average time spent in each pipeline stage.",
    ]

    if settings.GROQ_API_KEY and open_deals:
        try:
            client = _get_client()
            context = json.dumps({
                "open_deal_count": len(open_deals),
                "total_pipeline_value": round(total_pipeline_value, 2),
                "pipeline_weighted_value": round(pipeline_weighted_value, 2),
                "forecast_30_day": round(windows[30], 2),
                "forecast_60_day": round(windows[60], 2),
                "forecast_90_day": round(windows[90], 2),
                "deals_with_ai_score": scored_deal_count,
                "deals_without_ai_score": len(open_deals) - scored_deal_count,
                "historical_monthly_won_revenue": historical,
            }, indent=2)

            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Here is the computed forecast data:\n\n{context}"},
                ],
                max_tokens=400,
                temperature=0.3,
            )
            raw = _strip_fences(response.choices[0].message.content)
            data = json.loads(raw)

            narrative = str(data.get("narrative", narrative)).strip() or narrative
            candidate_confidence = str(data.get("confidence", confidence)).lower().strip()
            if candidate_confidence in ("low", "medium", "high"):
                confidence = candidate_confidence
            candidate_assumptions = data.get("assumptions", assumptions)
            if isinstance(candidate_assumptions, list) and candidate_assumptions:
                assumptions = [str(a) for a in candidate_assumptions][:4]
        except Exception:
            # Narrative generation is a nice-to-have — numeric forecast is still valid
            pass
    elif not open_deals:
        narrative = "No open deals in the pipeline right now — nothing to forecast."
        confidence = "low"

    return {
        "generated_at": datetime.now(timezone.utc),
        "open_deal_count": len(open_deals),
        "total_pipeline_value": round(total_pipeline_value, 2),
        "pipeline_weighted_value": round(pipeline_weighted_value, 2),
        "forecast_30_day": round(windows[30], 2),
        "forecast_60_day": round(windows[60], 2),
        "forecast_90_day": round(windows[90], 2),
        "historical_monthly_won": historical,
        "confidence": confidence,
        "narrative": narrative,
        "assumptions": assumptions,
    }