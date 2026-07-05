import json
from datetime import datetime, timezone
import groq
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.deal import Deal
from app.models.activity import Activity
from app.models.contact import Contact
from app.models.deal_stage_history import DealStageHistory


STAGE_LABELS = {
    "new": "New Lead", "contacted": "Contacted", "proposal": "Proposal",
    "negotiation": "Negotiation", "won": "Won", "lost": "Lost",
}

SYSTEM_PROMPT = """\
You are a B2B sales analyst scoring a single CRM deal on its likelihood to close as WON.
Score from 0 to 100, where 0 means very unlikely to close and 100 means near-certain to close.
Base your score on deal recency, activity engagement level, time spent in the current stage,
deal value relative to stage progression, and any other signals given.
Weight the following heuristics unless the data suggests otherwise:
- Deals with frequent recent activity (calls, emails, meetings) score higher.
- Deals stalled in the same stage for a long time score lower.
- Deals with no logged activity at all score lower regardless of stage.
- Later pipeline stages (proposal, negotiation) generally score higher than early stages
  (new, contacted), but only if activity supports it.

Return ONLY valid JSON, no markdown, no commentary, in this exact format:
{
  "score": 72,
  "reasoning": "one or two sentence explanation of the score",
  "factors": [
    {"label": "short factor name", "impact": "positive", "weight": "high"},
    {"label": "short factor name", "impact": "negative", "weight": "medium"}
  ]
}
Provide 2 to 5 factors total, mixing positive and negative where relevant."""


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


def _days_between(now: datetime, then: datetime) -> int:
    if then is None:
        return 0
    if then.tzinfo is None:
        then = then.replace(tzinfo=timezone.utc)
    return (now - then).days


def _build_deal_context(db: Session, deal: Deal) -> str:
    now = datetime.now(timezone.utc)
    lines = []
    lines.append(f"Deal title: {deal.title}")
    lines.append(f"Value: ${deal.value or 0:,.0f}")
    lines.append(f"Current stage: {STAGE_LABELS.get(deal.stage, deal.stage)}")
    lines.append(f"Company: {deal.company or 'Unknown'}")
    lines.append(f"Owner: {deal.owner or 'Unassigned'}")

    if deal.created_at:
        lines.append(f"Deal age: {_days_between(now, deal.created_at)} days since creation")

    last_stage_change = (
        db.query(DealStageHistory)
        .filter(DealStageHistory.deal_id == deal.id)
        .order_by(DealStageHistory.entered_at.desc())
        .first()
    )
    if last_stage_change and last_stage_change.entered_at:
        lines.append(f"Days in current stage: {_days_between(now, last_stage_change.entered_at)}")

    if deal.contact_id:
        activities = (
            db.query(Activity)
            .filter(Activity.contact_id == deal.contact_id)
            .order_by(Activity.created_at.desc())
            .limit(20)
            .all()
        )
        lines.append(f"Total logged activities for linked contact (last 20): {len(activities)}")
        if activities:
            last = activities[0]
            if last.created_at:
                lines.append(f"Days since last activity: {_days_between(now, last.created_at)}")
            type_counts = {}
            for a in activities:
                key = a.type or "note"
                type_counts[key] = type_counts.get(key, 0) + 1
            lines.append(f"Activity type breakdown: {type_counts}")
        else:
            lines.append("No activity has been logged with this contact yet.")

        contact = db.query(Contact).filter(Contact.id == deal.contact_id).first()
        if contact and contact.tags:
            lines.append(f"Contact tags: {[t.name for t in contact.tags]}")
    else:
        lines.append("No contact linked to this deal — engagement cannot be measured.")

    return "\n".join(lines)


def score_deal(db: Session, deal: Deal) -> dict:
    """
    Calls Groq to produce a 0-100 win-likelihood score plus reasoning and factors
    for a single deal, persists the result on the Deal row, and returns it.
    """
    client = _get_client()
    context = _build_deal_context(db, deal)

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Score this deal:\n\n{context}"},
            ],
            max_tokens=500,
            temperature=0.3,
        )
        raw = _strip_fences(response.choices[0].message.content)
        data = json.loads(raw)

        score = int(data.get("score", 0))
        score = max(0, min(100, score))
        reasoning = str(data.get("reasoning", "")).strip()
        factors = data.get("factors", [])
        if not isinstance(factors, list):
            factors = []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI scoring failed: {str(e)}")

    now = datetime.now(timezone.utc)
    deal.ai_score = score
    deal.ai_score_reasoning = reasoning
    deal.ai_score_factors = factors
    deal.ai_scored_at = now
    db.commit()
    db.refresh(deal)

    return {
        "deal_id": deal.id,
        "ai_score": score,
        "ai_score_reasoning": reasoning,
        "ai_score_factors": factors,
        "ai_scored_at": now,
    }


def score_all_open_deals(db: Session, user_id) -> dict:
    """Batch-score every open (not won/lost) deal for a user."""
    deals = (
        db.query(Deal)
        .filter(Deal.user_id == user_id, Deal.stage.notin_(["won", "lost"]))
        .all()
    )
    scored = 0
    failed = 0
    for deal in deals:
        try:
            score_deal(db, deal)
            scored += 1
        except Exception:
            failed += 1
    return {"scored": scored, "failed": failed, "total": len(deals)}