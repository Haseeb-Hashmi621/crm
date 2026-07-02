from sqlalchemy.orm import Session
from app.models.chatbot import ChatbotConfig, KnowledgeBaseEntry
from app.models.contact import Contact
from app.core.config import settings
from typing import List, Optional
import uuid
import groq


def get_or_create_chatbot_config(db: Session, user_id: uuid.UUID) -> ChatbotConfig:
    """Fetch this user's chatbot config, creating a default one if it doesn't exist yet."""
    config = db.query(ChatbotConfig).filter(ChatbotConfig.user_id == user_id).first()
    if config:
        return config

    config = ChatbotConfig(user_id=user_id)  # model defaults handle prompt/fallback/enabled
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def get_knowledge_base_context(db: Session, user_id: uuid.UUID, max_chars: int = 6000) -> str:
    """
    Concatenate this user's active knowledge base entries into a single text block
    for injection into the chatbot's system prompt.

    Deliberately simple concatenation (no embeddings/vector search) since the client
    hasn't supplied enough content yet to warrant retrieval — this is the swap point
    for real RAG later if the knowledge base grows large enough that dumping
    everything into context stops being practical.
    """
    entries: List[KnowledgeBaseEntry] = (
        db.query(KnowledgeBaseEntry)
        .filter(
            KnowledgeBaseEntry.user_id == user_id,
            KnowledgeBaseEntry.is_active == True,
        )
        .order_by(KnowledgeBaseEntry.category.asc().nullslast(), KnowledgeBaseEntry.created_at.asc())
        .all()
    )

    if not entries:
        return ""

    blocks = []
    for entry in entries:
        header = f"[{entry.category}] {entry.title}" if entry.category else entry.title
        blocks.append(f"{header}\n{entry.content}")

    context = "\n\n---\n\n".join(blocks)

    # Hard cap so a large knowledge base can't blow out the prompt / token budget.
    if len(context) > max_chars:
        context = context[:max_chars] + "\n\n[...knowledge base truncated...]"

    return context


def should_auto_reply(db: Session, contact: Contact, config: Optional[ChatbotConfig] = None) -> bool:
    """
    Decide whether the bot should generate an automatic reply for this contact.
    Requires BOTH the global per-user switch and the per-contact switch to be on.
    """
    if not contact.chatbot_enabled:
        return False

    if config is None:
        config = get_or_create_chatbot_config(db, contact.user_id)

    return bool(config.enabled)


def _get_groq_client() -> Optional[groq.Groq]:
    if not settings.GROQ_API_KEY:
        return None
    return groq.Groq(api_key=settings.GROQ_API_KEY)


def generate_bot_reply(
    db: Session,
    user_id: uuid.UUID,
    contact_name: str,
    conversation_history: List[dict],
) -> str:
    """
    Generate an automatic WhatsApp reply for a contact.

    conversation_history: list of {"type": str, "content": str, "created_at": str}
    ordered oldest -> newest, same shape used by /ai/suggest-reply.

    Returns the reply text. On any failure (missing API key, Groq error, empty
    response), returns this user's configured fallback_message instead of raising —
    callers (the webhook) should always get a string back and never crash the
    inbound-message pipeline because of an AI failure.
    """
    config = get_or_create_chatbot_config(db, user_id)

    client = _get_groq_client()
    if client is None:
        return config.fallback_message

    kb_context = get_knowledge_base_context(db, user_id)

    system_prompt = config.system_prompt
    if kb_context:
        system_prompt = (
            f"{config.system_prompt}\n\n"
            f"Use the following business information to answer accurately. "
            f"If the answer isn't covered below, be honest that you don't know "
            f"rather than guessing:\n\n{kb_context}"
        )

    transcript_lines = []
    for msg in conversation_history[-20:]:
        is_inbound = msg["content"].startswith("[Inbound]")
        clean = msg["content"].replace("[Inbound]", "").strip()
        speaker = contact_name if is_inbound else "Business"
        transcript_lines.append(f"{speaker}: {clean}")
    transcript = "\n".join(transcript_lines)

    user_prompt = (
        f"Conversation with {contact_name} on WhatsApp so far:\n\n{transcript}\n\n"
        "Write the next reply from the business, addressed to the customer. "
        "Reply with just the message text — no labels, no quotation marks."
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=500,
            temperature=0.5,
        )
        reply = response.choices[0].message.content.strip()
        if not reply:
            return config.fallback_message
        return reply
    except Exception:
        return config.fallback_message