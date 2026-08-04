from fastapi import APIRouter, Request, Response, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.contact import Contact
from app.models.activity import Activity
from app.models.user import User
from app.services import chatbot_service, conversation_service, sentiment_service
from typing import Optional

router = APIRouter()

# All inbound messages from numbers that are NOT already saved as a contact
# (e.g. someone scanning Sir's WhatsApp QR code) get auto-created as a new
# Contact under this account, so the conversation is never silently dropped.
# IMPORTANT: set this to Sir's actual CRM login email.
WEBHOOK_OWNER_EMAIL: Optional[str] = "test3@example.com"


def _normalize_phone(phone: str) -> str:
    phone = phone.strip()
    if phone.lower().startswith("whatsapp:"):
        phone = phone[9:]
    return ''.join(filter(str.isdigit, phone))


def _find_contact_by_phone(db: Session, raw_phone: str):
    normalized = _normalize_phone(raw_phone)

    contacts = db.query(Contact).all()

    for contact in contacts:
        if not contact.phone:
            continue
        stored = _normalize_phone(contact.phone)

        if stored == normalized:
            return contact

        variants = set([normalized])
        if normalized.startswith("92") and len(normalized) == 12:
            variants.add("0" + normalized[2:])
            variants.add(normalized[2:])
        if normalized.startswith("0") and len(normalized) == 11:
            variants.add("92" + normalized[1:])
            variants.add(normalized[1:])

        stored_variants = set([stored])
        if stored.startswith("92") and len(stored) == 12:
            stored_variants.add("0" + stored[2:])
            stored_variants.add(stored[2:])
        if stored.startswith("0") and len(stored) == 11:
            stored_variants.add("92" + stored[1:])
            stored_variants.add(stored[1:])

        if variants & stored_variants:
            return contact

    return None


def _get_webhook_owner(db: Session) -> Optional[User]:
    """Resolve which CRM user account should own contacts auto-created from
    inbound messages sent by numbers not already in the CRM.

    Priority:
      1. WEBHOOK_OWNER_EMAIL if explicitly set and that user exists
      2. First admin user in the system
      3. First user in the system (last resort)
    """
    if WEBHOOK_OWNER_EMAIL:
        user = db.query(User).filter(User.email == WEBHOOK_OWNER_EMAIL).first()
        if user:
            return user

    admin = db.query(User).filter(User.role == "admin").order_by(User.created_at.asc()).first()
    if admin:
        return admin

    return db.query(User).order_by(User.created_at.asc()).first()


def _find_or_create_contact_from_webhook(db: Session, raw_phone: str) -> Optional[Contact]:
    """Looks up a contact by phone across the CRM. If none exists, creates a
    new one under the webhook owner account so the conversation is captured
    instead of silently dropped (e.g. someone messaging in from a QR code
    who isn't already a saved contact). No name is available from Twilio's
    payload, so the contact is created with a placeholder name using the
    last 4 digits of the number for easy identification — Sir can rename
    it once he knows who it is."""
    existing = _find_contact_by_phone(db, raw_phone)
    if existing:
        return existing

    owner = _get_webhook_owner(db)
    if not owner:
        # No user account exists at all yet — nothing we can attach this to.
        return None

    normalized = _normalize_phone(raw_phone)
    last_four = normalized[-4:] if len(normalized) >= 4 else normalized

    contact = Contact(
        first_name="Unknown",
        last_name=f"Contact ({last_four})",
        email=None,
        phone=normalized,
        company=None,
        user_id=owner.id,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def _try_analyze_sentiment(db: Session, activity: Activity) -> None:
    """
    Best-effort sentiment analysis for an inbound activity. Never raises —
    a sentiment analysis failure must never break the inbound message
    pipeline or the response sent back to Twilio.
    """
    try:
        sentiment_service.analyze_and_store_activity_sentiment(db, activity)
    except Exception:
        db.rollback()


@router.post("/twilio/sms")
async def twilio_sms_inbound(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    from_number = form.get("From", "")
    body = form.get("Body", "")

    if not from_number or not body:
        return Response(content="<Response/>", media_type="text/xml")

    contact = _find_or_create_contact_from_webhook(db, from_number)

    if contact:
        activity = Activity(
            contact_id=contact.id,
            type="sms",
            content=f"[Inbound] {body}",
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)

        # ── Sentiment analysis (Feature #51) ────────────────────────────────
        _try_analyze_sentiment(db, activity)

    return Response(content="<Response/>", media_type="text/xml")


@router.post("/twilio/whatsapp")
async def twilio_whatsapp_inbound(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    from_number = form.get("From", "")
    body = form.get("Body", "")

    if not from_number or not body:
        return Response(content="<Response/>", media_type="text/xml")

    contact = _find_or_create_contact_from_webhook(db, from_number)

    if contact:
        inbound_activity = Activity(
            contact_id=contact.id,
            type="whatsapp",
            content=f"[Inbound] {body}",
        )
        db.add(inbound_activity)
        db.commit()
        db.refresh(inbound_activity)

        # ── Sentiment analysis (Feature #51) ────────────────────────────────
        _try_analyze_sentiment(db, inbound_activity)

        # ── Chatbot auto-reply ──────────────────────────────────────────────
        # Only fires if both the user's global bot switch AND this contact's
        # per-conversation switch are on. Any failure here is swallowed —
        # a bot hiccup must never break inbound message logging.
        try:
            if chatbot_service.should_auto_reply(db, contact):
                history = (
                    db.query(Activity)
                    .filter(Activity.contact_id == contact.id)
                    .order_by(Activity.created_at.asc())
                    .all()
                )
                conversation_history = [
                    {
                        "type": a.type or "note",
                        "content": a.content,
                        "created_at": a.created_at.isoformat() if a.created_at else None,
                    }
                    for a in history
                ]

                contact_name = f"{contact.first_name or ''} {contact.last_name or ''}".strip() or "Customer"

                reply_text = chatbot_service.generate_bot_reply(
                    db=db,
                    user_id=contact.user_id,
                    contact_name=contact_name,
                    conversation_history=conversation_history,
                )

                result = conversation_service.send_message(
                    db=db,
                    user_id=contact.user_id,
                    contact_id=str(contact.id),
                    channel="whatsapp",
                    content=reply_text,
                )

                # Mark this outbound activity as bot-generated so the UI can
                # distinguish it from a human agent's reply.
                if "activity" in result:
                    result["activity"].is_bot = True
                    db.commit()
        except Exception:
            # Never let a bot failure break the webhook response to Twilio.
            db.rollback()

    return Response(content="<Response/>", media_type="text/xml")