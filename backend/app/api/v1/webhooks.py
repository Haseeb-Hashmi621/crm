from fastapi import APIRouter, Request, Response, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.contact import Contact
from app.models.activity import Activity
from sqlalchemy import func

router = APIRouter()


def _normalize_phone(phone: str) -> str:
    """Strip whatsapp: prefix and leading + for comparison."""
    phone = phone.strip()
    if phone.lower().startswith("whatsapp:"):
        phone = phone[9:]
    if phone.startswith("+"):
        phone = phone[1:]
    return phone


def _find_contact_by_phone(db: Session, raw_phone: str):
    """
    Find a contact by phone number, tolerating formatting differences.
    Strips whatsapp: prefix, leading +, leading country code 92, leading 0.
    """
    normalized = _normalize_phone(raw_phone)

    # Try exact match first (after stripping + and whatsapp:)
    contacts = db.query(Contact).all()
    for contact in contacts:
        if not contact.phone:
            continue
        stored = _normalize_phone(contact.phone)

        # Direct match
        if stored == normalized:
            return contact

        # Pakistani numbers: 923XXXXXXXXX == 03XXXXXXXXX == 3XXXXXXXXX
        variants = set()
        for n in [stored, normalized]:
            variants.add(n)
            if n.startswith("92") and len(n) == 12:
                variants.add("0" + n[2:])   # 03XXXXXXXXX
                variants.add(n[2:])          # 3XXXXXXXXX
            if n.startswith("0") and len(n) == 11:
                variants.add("92" + n[1:])  # 923XXXXXXXXX
                variants.add(n[1:])          # 3XXXXXXXXX

        stored_variants = set()
        for n in [stored]:
            stored_variants.add(n)
            if n.startswith("92") and len(n) == 12:
                stored_variants.add("0" + n[2:])
                stored_variants.add(n[2:])
            if n.startswith("0") and len(n) == 11:
                stored_variants.add("92" + n[1:])
                stored_variants.add(n[1:])

        if variants & stored_variants:
            return contact

    return None


@router.post("/twilio/sms")
async def twilio_sms_inbound(request: Request, db: Session = Depends(get_db)):
    """
    Twilio webhook for inbound SMS.
    Twilio POST fields: From, To, Body, MessageSid
    """
    form = await request.form()
    from_number = form.get("From", "")
    body = form.get("Body", "")
    message_sid = form.get("MessageSid", "")

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

    # Always return empty TwiML so Twilio doesn't retry
    return Response(content="<Response/>", media_type="text/xml")


@router.post("/twilio/whatsapp")
async def twilio_whatsapp_inbound(request: Request, db: Session = Depends(get_db)):
    """
    Twilio webhook for inbound WhatsApp messages.
    Twilio POST fields: From (whatsapp:+...), To, Body, MessageSid
    """
    form = await request.form()
    from_number = form.get("From", "")   # e.g. whatsapp:+923001234567
    body = form.get("Body", "")
    message_sid = form.get("MessageSid", "")

    if not from_number or not body:
        return Response(content="<Response/>", media_type="text/xml")

    contact = _find_contact_by_phone(db, from_number)

    if contact:
        activity = Activity(
            contact_id=contact.id,
            type="whatsapp",
            content=f"[Inbound] {body}",
        )
        db.add(activity)
        db.commit()

    return Response(content="<Response/>", media_type="text/xml")