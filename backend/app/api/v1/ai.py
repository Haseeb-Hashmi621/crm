from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.core.config import settings
from pydantic import BaseModel
from typing import List
import json
from groq import Groq

router = APIRouter()

class Message(BaseModel):
    type: str        # sms, whatsapp, email, note, etc.
    content: str
    created_at: str  # ISO string

class SuggestReplyRequest(BaseModel):
    contact_name: str
    messages: List[Message]

class SuggestReplyResponse(BaseModel):
    suggestions: List[str]


@router.post("/suggest-reply", response_model=SuggestReplyResponse)
async def suggest_reply(
    request: SuggestReplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    # Take last 10 messages only
    recent = request.messages[-10:]

    # Format conversation for the prompt
    conversation_lines = []
    for msg in recent:
        is_inbound = msg.content.startswith("[Inbound]")
        clean_content = msg.content.replace("[Inbound]", "").strip()
        speaker = request.contact_name if is_inbound else "You"
        conversation_lines.append(f"{speaker} ({msg.type}): {clean_content}")

    conversation_text = "\n".join(conversation_lines)

    system_prompt = (
        "You are a professional CRM sales assistant helping a business agent reply to customer messages. "
        "Based on the conversation provided, suggest exactly 3 short, professional reply options. "
        "Each reply should be ready to send — natural, concise, and appropriate for the channel (SMS/WhatsApp). "
        "Return ONLY a valid JSON array of exactly 3 strings. "
        "No explanation, no markdown, no code blocks, no extra text — just the raw JSON array."
    )

    user_prompt = (
        f"Here is the recent conversation with {request.contact_name}:\n\n"
        f"{conversation_text}\n\n"
        f"Suggest 3 short professional replies I can send next."
    )

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=500,
        )

        raw = completion.choices[0].message.content.strip()

        # Strip markdown code blocks if model wraps it anyway
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        suggestions = json.loads(raw)

        if not isinstance(suggestions, list) or len(suggestions) < 1:
            raise ValueError("Invalid response format from AI")

        # Ensure exactly 3 suggestions
        suggestions = suggestions[:3]
        while len(suggestions) < 3:
            suggestions.append("Thank you for reaching out. I'll get back to you shortly.")

        return SuggestReplyResponse(suggestions=suggestions)

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid format. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")