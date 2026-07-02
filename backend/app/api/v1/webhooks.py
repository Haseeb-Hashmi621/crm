from fastapi import APIRouter, Request, Response, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.contact import Contact
from app.models.activity import Activity
from app.services import chatbot_service, conversation_service

router = APIRouter()


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


@router.post("/twilio/sms")
async def twilio_sms_inbound(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    from_number = form.get("From", "")
    body = form.get("Body", "")

    if not from_number or not body:
        return Response(content="<Response/>", media_type="text/xml")

    contact = _find_contact_by_phone(db, from_number)

    if contact:
        activity = Activity(
            contact_id=contact.id,
            type="sms",
            content=f"[Inbound] {body}",
        )
        db.add(activity)
        db.commit()

    return Response(content="<Response/>", media_type="text/xml")


@router.post("/twilio/whatsapp")
async def twilio_whatsapp_inbound(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    from_number = form.get("From", "")
    body = form.get("Body", "")

    if not from_number or not body:
        return Response(content="<Response/>", media_type="text/xml")

    contact = _find_contact_by_phone(db, from_number)

    if contact:
        inbound_activity = Activity(
            contact_id=contact.id,
            type="whatsapp",
            content=f"[Inbound] {body}",
        )
        db.add(inbound_activity)
        db.commit()

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