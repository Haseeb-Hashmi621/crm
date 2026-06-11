from sqlalchemy.orm import Session
from app.models.contact import Contact
from app.models.activity import Activity
from app.core.config import settings
from typing import List, Optional, Dict
import uuid
import resend
from twilio.rest import Client

resend.api_key = settings.RESEND_API_KEY


def _format_phone_e164(phone: str, default_country_code: str = "92") -> str:
    cleaned = ''.join(filter(str.isdigit, phone))
    if cleaned.startswith('92') and len(cleaned) == 12:
        return f"+{cleaned}"
    if cleaned.startswith('0') and len(cleaned) == 11:
        return f"+{default_country_code}{cleaned[1:]}"
    if len(cleaned) >= 11:
        return f"+{cleaned}"
    return f"+{cleaned}"


def _format_phone_whatsapp(phone: str, default_country_code: str = "92") -> str:
    return f"whatsapp:{_format_phone_e164(phone, default_country_code)}"


def _get_twilio_client() -> Client:
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def get_conversations(db: Session, user_id: uuid.UUID) -> List[dict]:
    contacts = db.query(Contact).filter(Contact.user_id == user_id).all()
    if not contacts:
        return []
    contact_ids = [c.id for c in contacts]

    activities = (
        db.query(Activity)
        .filter(Activity.contact_id.in_(contact_ids))
        .order_by(Activity.created_at.desc())
        .all()
    )

    latest_by_contact: Dict[uuid.UUID, Activity] = {}
    for a in activities:
        if a.contact_id not in latest_by_contact:
            latest_by_contact[a.contact_id] = a

    results = []
    for c in contacts:
        results.append({"contact": c, "last_activity": latest_by_contact.get(c.id)})

    results.sort(
        key=lambda r: r["last_activity"].created_at if r["last_activity"] else r["contact"].created_at,
        reverse=True
    )
    return results


def get_conversation_thread(db: Session, user_id: uuid.UUID, contact_id: str) -> Optional[dict]:
    contact = db.query(Contact).filter(
        Contact.id == contact_id, Contact.user_id == user_id
    ).first()
    if not contact:
        return None

    messages = (
        db.query(Activity)
        .filter(Activity.contact_id == contact_id)
        .order_by(Activity.created_at.asc())
        .all()
    )

    return {"contact": contact, "messages": messages}


def send_message(
    db: Session, user_id: uuid.UUID, contact_id: str,
    channel: str, content: str, subject: Optional[str] = None
) -> dict:
    contact = db.query(Contact).filter(
        Contact.id == contact_id, Contact.user_id == user_id
    ).first()
    if not contact:
        return {"error": "Contact not found"}

    channel = channel.lower()
    if not content.strip():
        return {"error": "Message cannot be empty"}

    if channel == "email":
        if not contact.email:
            return {"error": "Contact has no email address"}
        email_subject = subject or "Message from your CRM"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            {content.replace(chr(10), '<br>')}
        </div>
        """
        try:
            resend.Emails.send({
                "from": settings.RESEND_FROM_EMAIL,
                "to": contact.email,
                "subject": email_subject,
                "html": html_body,
            })
        except Exception as e:
            return {"error": f"Failed to send email: {str(e)}"}
        activity_content = f"Subject: {subject}\n\n{content}" if subject else content

    elif channel == "sms":
        if not contact.phone:
            return {"error": "Contact has no phone number"}
        try:
            _get_twilio_client().messages.create(
                body=content,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=_format_phone_e164(contact.phone),
            )
        except Exception as e:
            return {"error": f"Failed to send SMS: {str(e)}"}
        activity_content = content

    elif channel == "whatsapp":
        if not contact.phone:
            return {"error": "Contact has no phone number"}
        try:
            _get_twilio_client().messages.create(
                body=content,
                from_=settings.TWILIO_WHATSAPP_NUMBER,
                to=_format_phone_whatsapp(contact.phone),
            )
        except Exception as e:
            return {"error": f"Failed to send WhatsApp message: {str(e)}"}
        activity_content = content

    elif channel in ("note", "call", "meeting"):
        activity_content = content

    else:
        return {"error": "Invalid channel"}

    activity = Activity(
        contact_id=contact.id,
        type=channel,
        content=activity_content,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    return {"activity": activity}