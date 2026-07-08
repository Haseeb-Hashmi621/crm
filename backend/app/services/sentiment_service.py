"""
backend/app/services/sentiment_service.py

Feature #51 — Sentiment Analysis.

Two entry points:
  analyze_and_store_activity_sentiment(db, activity) — analyzes a single
    activity's content and persists sentiment/sentiment_score on it. Used
    both automatically (inbound WhatsApp/SMS webhook) and on-demand
    (manual "Analyze" action from the UI on any logged activity).

  get_at_risk_contacts(db, user_id, limit) — aggregates recent negative-
    sentiment activity per contact so the dashboard can surface contacts
    who may need attention.
"""
import json
from datetime import datetime, timezone, timedelta
import groq
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.models.activity import Activity
from app.models.contact import Contact

SYSTEM_PROMPT = """\
You are a sentiment analysis engine for a CRM. Read the message below (which may be a \
customer's inbound message, a call note, or a meeting note) and classify the sentiment \
of the CUSTOMER as expressed in or reflected by this text.

Return ONLY valid JSON, no markdown, no commentary, in this exact format:
{"sentiment": "positive", "score": 0.6, "reasoning": "short one sentence reason"}

Rules:
- "sentiment" must be exactly one of: "positive", "neutral", "negative"
- "score" is a float from -1.0 (extremely negative) to 1.0 (extremely positive), 0 is neutral
- Base the judgment on tone, word choice, urgency, and any expressed frustration or satisfaction
- Short factual messages with no emotional signal should be "neutral" with a score near 0"""


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


def analyze_text(text: str) -> dict:
    """Runs sentiment analysis on a raw string. Returns {sentiment, score, reasoning}."""
    client = _get_client()
    clean_text = text.replace("[Inbound]", "").strip()
    if not clean_text:
        return {"sentiment": "neutral", "score": 0.0, "reasoning": "Empty message"}

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": clean_text},
            ],
            max_tokens=200,
            temperature=0.2,
        )
        raw = _strip_fences(response.choices[0].message.content)
        data = json.loads(raw)

        sentiment = str(data.get("sentiment", "neutral")).lower().strip()
        if sentiment not in ("positive", "neutral", "negative"):
            sentiment = "neutral"

        score = float(data.get("score", 0.0))
        score = max(-1.0, min(1.0, score))

        reasoning = str(data.get("reasoning", "")).strip()

        return {"sentiment": sentiment, "score": score, "reasoning": reasoning}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {str(e)}")


def analyze_and_store_activity_sentiment(db: Session, activity: Activity) -> dict:
    """Analyzes an activity's content and persists the result on the row."""
    result = analyze_text(activity.content)
    now = datetime.now(timezone.utc)

    activity.sentiment = result["sentiment"]
    activity.sentiment_score = result["score"]
    activity.sentiment_analyzed_at = now
    db.commit()
    db.refresh(activity)

    return {
        "activity_id": activity.id,
        "sentiment": result["sentiment"],
        "sentiment_score": result["score"],
        "sentiment_analyzed_at": now,
    }


def get_at_risk_contacts(db: Session, user_id, limit: int = 10, days: int = 30) -> dict:
    """
    Aggregates negative-sentiment activity in the last `days` days, grouped by
    contact, for contacts owned by user_id. Returns contacts sorted by most
    negative-activity count first, then by lowest average sentiment score.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    user_contact_ids = db.query(Contact.id).filter(Contact.user_id == user_id).subquery()

    rows = (
        db.query(
            Activity.contact_id,
            func.count(Activity.id).label("negative_count"),
            func.avg(Activity.sentiment_score).label("avg_score"),
        )
        .filter(
            Activity.contact_id.in_(user_contact_ids),
            Activity.sentiment == "negative",
            Activity.created_at >= since,
        )
        .group_by(Activity.contact_id)
        .order_by(func.count(Activity.id).desc())
        .limit(limit)
        .all()
    )

    total_negative = (
        db.query(func.count(Activity.id))
        .filter(
            Activity.contact_id.in_(user_contact_ids),
            Activity.sentiment == "negative",
            Activity.created_at >= since,
        )
        .scalar()
    ) or 0

    results = []
    for contact_id, negative_count, avg_score in rows:
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            continue

        most_recent = (
            db.query(Activity)
            .filter(
                Activity.contact_id == contact_id,
                Activity.sentiment == "negative",
                Activity.created_at >= since,
            )
            .order_by(Activity.created_at.desc())
            .first()
        )

        recent_content = None
        if most_recent:
            recent_content = most_recent.content.replace("[Inbound]", "").strip()
            if len(recent_content) > 140:
                recent_content = recent_content[:140] + "…"

        results.append({
            "contact_id": contact.id,
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "email": contact.email,
            "phone": contact.phone,
            "company": contact.company,
            "negative_count": negative_count,
            "avg_sentiment_score": round(float(avg_score), 2) if avg_score is not None else 0.0,
            "most_recent_negative_content": recent_content,
            "most_recent_negative_at": most_recent.created_at if most_recent else None,
        })

    return {"contacts": results, "total_negative_activities": total_negative}