"""
backend/app/services/ai_email_service.py

Two-pass AI email reply generation:
  Pass 1 — Extract every request/question/action item as a JSON checklist
  Pass 2 — Generate a full business email addressing every checklist item
  Pass 3 — Verify all items addressed; if not, one auto-repair attempt

Exposed via:  POST /ai/generate-email-reply
"""

import json
import groq
from typing import Optional
from fastapi import HTTPException

from app.core.config import settings


def _get_client() -> groq.Groq:
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured")
    return groq.Groq(api_key=settings.GROQ_API_KEY)


def _strip_fences(raw: str) -> str:
    """Remove markdown code fences if Groq adds them despite instructions."""
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


# ── Pass 1: Extract checklist ─────────────────────────────────────────────────

EXTRACT_SYSTEM = """\
You are a business correspondence analyst. Read the email below and extract \
EVERY distinct request, question, action item, or requirement the sender raised — \
no matter how minor. Do not summarize or merge items; list them granularly.

Return ONLY valid JSON in this exact format, no markdown, no commentary:
{
  "items": [
    {"id": 1, "request": "short description", "category": "pricing|timeline|technical|logistics|documentation|other"}
  ]
}"""


def _extract_checklist(client: groq.Groq, email_body: str, email_subject: str) -> list[dict]:
    user_prompt = f"Subject: {email_subject}\n\n{email_body}"
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": EXTRACT_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=600,
        temperature=0.1,
    )
    raw = _strip_fences(resp.choices[0].message.content)
    data = json.loads(raw)
    return data.get("items", [])


# ── Pass 2: Generate reply ────────────────────────────────────────────────────

GENERATE_SYSTEM = """\
You are an experienced account manager writing a formal business email reply to a client. \
You write the way a senior sales/operations professional would — thorough, structured, and precise. \
You are NOT a chat assistant; you are drafting professional business correspondence.

Rules:
- Address EVERY numbered item in the checklist. If information for an item is not available, \
  acknowledge it professionally (e.g. "Our team will follow up separately with onboarding details") \
  rather than omitting it entirely.
- For 4+ items, use short headers or a numbered/bulleted structure — do NOT write one long paragraph.
- Open with one sentence acknowledging the email, then address items in the order they appear.
- Close with a clear next step or call to action.
- NEVER ask the client if they would like you to address the remaining items — address them all now.
- Maintain formal, professional tone. No filler like "Sounds great!" or "Happy to help!"
- Do NOT include a subject line — only the body text."""


def _generate_reply(
    client: groq.Groq,
    email_body: str,
    email_subject: str,
    sender_name: str,
    checklist: list[dict],
    extra_context: str = "",
) -> str:
    numbered = "\n".join(f"{item['id']}. {item['request']}" for item in checklist)
    count = len(checklist)

    user_prompt = f"""\
ORIGINAL CLIENT EMAIL:
Subject: {email_subject}
From: {sender_name}

{email_body}

---
ITEMS TO ADDRESS (you MUST cover all {count}):
{numbered}
{f"ADDITIONAL CONTEXT:{chr(10)}{extra_context}" if extra_context else ""}
---

Write the complete professional reply now, addressing items 1-{count} above explicitly."""

    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": GENERATE_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=1500,
        temperature=0.3,
    )
    return resp.choices[0].message.content.strip()


# ── Pass 3: Verify coverage ───────────────────────────────────────────────────

VERIFY_SYSTEM = """\
You are a QA reviewer. Given a checklist of client requests and a draft reply, \
check whether each checklist item is addressed in the draft (even partially or by deferral is OK).

Return ONLY valid JSON, no markdown:
{
  "results": [
    {"id": 1, "addressed": true, "note": ""}
  ],
  "all_addressed": true
}"""


def _verify_reply(client: groq.Groq, checklist: list[dict], draft: str) -> dict:
    checklist_text = "\n".join(f"{i['id']}. {i['request']}" for i in checklist)
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": VERIFY_SYSTEM},
            {"role": "user", "content": f"CHECKLIST:\n{checklist_text}\n\nDRAFT REPLY:\n{draft}"},
        ],
        max_tokens=400,
        temperature=0.1,
    )
    raw = _strip_fences(resp.choices[0].message.content)
    return json.loads(raw)


def _repair_reply(
    client: groq.Groq,
    draft: str,
    missed_items: list[dict],
    checklist: list[dict],
) -> str:
    missed_text = "\n".join(f"{i['id']}. {i['request']}" for i in missed_items)
    numbered_all = "\n".join(f"{i['id']}. {i['request']}" for i in checklist)

    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": GENERATE_SYSTEM},
            {"role": "user", "content": (
                f"Your previous draft did not adequately address these items:\n{missed_text}\n\n"
                f"Here is the full checklist of ALL {len(checklist)} items that must be covered:\n{numbered_all}\n\n"
                f"Here is the previous draft:\n{draft}\n\n"
                "Revise the draft to include the missed items, keeping everything else intact. "
                "Return only the complete revised reply body."
            )},
        ],
        max_tokens=1500,
        temperature=0.3,
    )
    return resp.choices[0].message.content.strip()


# ── Public API ────────────────────────────────────────────────────────────────

def generate_email_reply(
    email_body: str,
    email_subject: str,
    sender_name: str,
    extra_context: str = "",
) -> dict:
    """
    Returns:
        {
          "draft": str,
          "checklist": list[dict],
          "warnings": list[str],   # items that still seem unaddressed after repair
          "item_count": int,
        }
    """
    client = _get_client()

    # Pass 1 — extract checklist
    try:
        checklist = _extract_checklist(client, email_body, email_subject)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checklist extraction failed: {e}")

    if not checklist:
        # Fallback: treat whole email as one item
        checklist = [{"id": 1, "request": "Respond to the client's email", "category": "other"}]

    # Pass 2 — generate reply
    try:
        draft = _generate_reply(client, email_body, email_subject, sender_name, checklist, extra_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reply generation failed: {e}")

    # Pass 3 — verify
    warnings = []
    try:
        verification = _verify_reply(client, checklist, draft)
        if not verification.get("all_addressed", True):
            missed = [
                r for r in verification.get("results", [])
                if not r.get("addressed", True)
            ]
            if missed:
                missed_items = [item for item in checklist if item["id"] in {m["id"] for m in missed}]
                # One auto-repair attempt
                try:
                    draft = _repair_reply(client, draft, missed_items, checklist)
                    # Re-verify after repair
                    v2 = _verify_reply(client, checklist, draft)
                    still_missed = [
                        r for r in v2.get("results", [])
                        if not r.get("addressed", True)
                    ]
                    if still_missed:
                        warnings = [
                            next((i["request"] for i in checklist if i["id"] == m["id"]), f"Item {m['id']}")
                            for m in still_missed
                        ]
                except Exception:
                    # Repair failed — surface original missed as warnings
                    warnings = [
                        next((i["request"] for i in checklist if i["id"] == m["id"]), f"Item {m['id']}")
                        for m in missed
                    ]
    except Exception:
        # Verification failure is non-fatal — return draft with no warnings
        pass

    return {
        "draft": draft,
        "checklist": checklist,
        "warnings": warnings,
        "item_count": len(checklist),
    }