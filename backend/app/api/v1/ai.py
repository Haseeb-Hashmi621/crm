from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import groq

from app.core.config import settings

router = APIRouter()

# ── Shared Groq client ──────────────────────────────────────────────────────

def get_groq_client():
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured")
    return groq.Groq(api_key=settings.GROQ_API_KEY)


# ── Schemas ─────────────────────────────────────────────────────────────────

class MessageInput(BaseModel):
    type: str
    content: str
    created_at: Optional[str] = None


class SuggestReplyRequest(BaseModel):
    contact_name: str
    messages: List[MessageInput]


class SuggestReplyResponse(BaseModel):
    suggestions: List[str]


class SummarizeRequest(BaseModel):
    contact_name: str
    messages: List[MessageInput]


class SummarizeResponse(BaseModel):
    summary: str
    suggested_tags: List[str]


# ── POST /ai/suggest-reply ───────────────────────────────────────────────────

@router.post("/suggest-reply", response_model=SuggestReplyResponse)
async def suggest_reply(request: SuggestReplyRequest):
    client = get_groq_client()

    # Build conversation transcript
    transcript_lines = []
    for msg in request.messages[-20:]:  # last 20 messages for context
        is_inbound = msg.content.startswith("[Inbound]")
        clean = msg.content.replace("[Inbound]", "").strip()
        speaker = request.contact_name if is_inbound else "Agent"
        transcript_lines.append(f"{speaker}: {clean}")

    transcript = "\n".join(transcript_lines)

    system_prompt = (
        "You are a helpful CRM assistant. Generate exactly 3 short, professional reply suggestions "
        "for a sales or support agent to send to a contact. "
        "Each suggestion should be concise (1-2 sentences max), natural, and relevant to the conversation. "
        "Return ONLY a JSON object in this exact format with no extra text:\n"
        '{"suggestions": ["reply 1", "reply 2", "reply 3"]}'
    )

    user_prompt = (
        f"Conversation with {request.contact_name}:\n\n{transcript}\n\n"
        "Generate 3 reply suggestions for the agent."
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=500,
            temperature=0.7,
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        import json
        data = json.loads(raw)
        suggestions = data.get("suggestions", [])

        if not suggestions or not isinstance(suggestions, list):
            raise ValueError("Invalid suggestions format")

        return SuggestReplyResponse(suggestions=suggestions[:3])

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ── POST /ai/summarize ───────────────────────────────────────────────────────

@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_conversation(request: SummarizeRequest):
    client = get_groq_client()

    # Build transcript — use all messages for summary (not just last 20)
    transcript_lines = []
    for msg in request.messages:
        is_inbound = msg.content.startswith("[Inbound]")
        clean = msg.content.replace("[Inbound]", "").strip()
        speaker = request.contact_name if is_inbound else "Agent"
        channel = f"[{msg.type.upper()}]"
        transcript_lines.append(f"{channel} {speaker}: {clean}")

    transcript = "\n".join(transcript_lines)

    system_prompt = (
        "You are a CRM assistant that reads sales/support conversation logs and produces concise summaries. "
        "Return ONLY a JSON object with no extra text, preamble, or markdown fences in this exact format:\n"
        '{"summary": "2-3 sentence summary here", "suggested_tags": ["tag1", "tag2", "tag3"]}\n\n'
        "Rules for the summary: 2-3 sentences, past tense, factual, mention the key topic, outcome, and any next steps if present.\n"
        "Rules for suggested_tags: 3-5 short lowercase tags (1-3 words each) that describe the contact's intent, "
        "product interest, or status. Examples: 'hot lead', 'pricing inquiry', 'follow up needed', 'enterprise', "
        "'churned', 'demo requested', 'support issue', 'onboarding'. Pick tags relevant to THIS conversation only."
    )

    user_prompt = (
        f"Conversation with {request.contact_name}:\n\n{transcript}\n\n"
        "Summarize this conversation and suggest relevant CRM tags."
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=500,
            temperature=0.4,   # lower temp = more factual/consistent for summaries
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown fences if Groq adds them despite instructions
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        import json
        data = json.loads(raw)

        summary = data.get("summary", "").strip()
        suggested_tags = data.get("suggested_tags", [])

        if not summary:
            raise ValueError("Empty summary returned")

        # Sanitize tags — lowercase, strip whitespace, max 5
        suggested_tags = [t.lower().strip() for t in suggested_tags if isinstance(t, str)][:5]

        return SummarizeResponse(summary=summary, suggested_tags=suggested_tags)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")