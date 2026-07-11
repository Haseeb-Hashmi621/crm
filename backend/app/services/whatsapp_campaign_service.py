from sqlalchemy.orm import Session
from app.models.whatsapp_campaign import WhatsappCampaign, WhatsappCampaignRecipient
from app.models.contact import Contact
from app.core.config import settings
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from twilio.rest import Client


def format_phone_whatsapp(phone: str, default_country_code: str = "92") -> str:
    """Format phone number for WhatsApp — must be whatsapp:+E.164"""
    cleaned = ''.join(filter(str.isdigit, phone))
    if cleaned.startswith('92') and len(cleaned) == 12:
        return f"whatsapp:+{cleaned}"
    if cleaned.startswith('0') and len(cleaned) == 11:
        return f"whatsapp:+{default_country_code}{cleaned[1:]}"
    if len(cleaned) >= 10:
        return f"whatsapp:+{cleaned}"
    return f"whatsapp:+{cleaned}"


def get_twilio_client() -> Client:
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def get_whatsapp_campaigns(db: Session, user_id: uuid.UUID) -> List[WhatsappCampaign]:
    return db.query(WhatsappCampaign).filter(
        WhatsappCampaign.user_id == user_id
    ).order_by(WhatsappCampaign.created_at.desc()).all()


def get_whatsapp_campaign(
    db: Session, campaign_id: str, user_id: uuid.UUID
) -> Optional[WhatsappCampaign]:
    return db.query(WhatsappCampaign).filter(
        WhatsappCampaign.id == campaign_id,
        WhatsappCampaign.user_id == user_id
    ).first()


def create_whatsapp_campaign(
    db: Session, name: str, message: str, user_id: uuid.UUID
) -> WhatsappCampaign:
    campaign = WhatsappCampaign(
        user_id=user_id,
        name=name,
        message=message,
        status="draft"
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


def delete_whatsapp_campaign(
    db: Session, campaign_id: str, user_id: uuid.UUID
) -> bool:
    campaign = get_whatsapp_campaign(db, campaign_id, user_id)
    if not campaign:
        return False
    db.delete(campaign)
    db.commit()
    return True


# ── Scheduling (Priority 5) ───────────────────────────────────────────────────

def schedule_whatsapp_campaign(
    db: Session,
    campaign_id: str,
    user_id: uuid.UUID,
    scheduled_at: datetime,
    contact_ids: Optional[List[uuid.UUID]] = None,
) -> dict:
    campaign = get_whatsapp_campaign(db, campaign_id, user_id)
    if not campaign:
        return {"error": "Campaign not found"}

    if campaign.status not in ("draft", "scheduled", "failed"):
        return {
            "error": f"Cannot schedule a campaign with status '{campaign.status}'"
        }

    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

    if scheduled_at <= datetime.now(timezone.utc):
        return {"error": "Scheduled time must be in the future"}

    campaign.status = "scheduled"
    campaign.scheduled_at = scheduled_at
    campaign.scheduled_contact_ids = (
        [str(cid) for cid in contact_ids] if contact_ids else None
    )
    campaign.schedule_failed_reason = None

    db.commit()
    db.refresh(campaign)

    return {"campaign": campaign}


def cancel_whatsapp_schedule(
    db: Session,
    campaign_id: str,
    user_id: uuid.UUID
) -> dict:
    campaign = get_whatsapp_campaign(db, campaign_id, user_id)
    if not campaign:
        return {"error": "Campaign not found"}

    if campaign.status != "scheduled":
        return {
            "error": f"Campaign is not scheduled (status: '{campaign.status}')"
        }

    campaign.status = "draft"
    campaign.scheduled_at = None
    campaign.scheduled_contact_ids = None
    campaign.schedule_failed_reason = None

    db.commit()
    db.refresh(campaign)

    return {"campaign": campaign}


def send_whatsapp_campaign(
    db: Session,
    campaign_id: str,
    user_id: uuid.UUID,
    contact_ids: Optional[List[uuid.UUID]] = None
) -> dict:
    campaign = get_whatsapp_campaign(db, campaign_id, user_id)
    if not campaign:
        return {"error": "Campaign not found"}

    if campaign.status == "sent":
        return {"error": "Campaign already sent"}

    # Get contacts
    query = db.query(Contact).filter(Contact.user_id == user_id)
    if contact_ids:
        query = query.filter(Contact.id.in_(contact_ids))
    contacts = query.all()

    if not contacts:
        return {"error": "No contacts found"}

    client = get_twilio_client()
    sent_count = 0
    failed_count = 0
    skipped_count = 0

    for contact in contacts:
        if not contact.phone:
            skipped_count += 1
            continue

        contact_name = f"{contact.first_name or ''} {contact.last_name or ''}".strip()

        # Personalize message
        personalized = campaign.message
        personalized = personalized.replace("{{name}}", contact_name)
        personalized = personalized.replace("{{company}}", contact.company or "")
        personalized = personalized.replace("{{phone}}", contact.phone or "")

        whatsapp_to = format_phone_whatsapp(contact.phone)

        try:
            msg = client.messages.create(
                body=personalized,
                from_=settings.TWILIO_WHATSAPP_NUMBER,
                to=whatsapp_to,
            )

            recipient = WhatsappCampaignRecipient(
                campaign_id=campaign.id,
                contact_id=contact.id,
                phone=contact.phone,
                name=contact_name,
                status="sent",
                message_sid=msg.sid,
                sent_at=datetime.now(timezone.utc)
            )
            db.add(recipient)
            sent_count += 1

        except Exception as e:
            recipient = WhatsappCampaignRecipient(
                campaign_id=campaign.id,
                contact_id=contact.id,
                phone=contact.phone,
                name=contact_name,
                status="failed",
                error=str(e)[:500]
            )
            db.add(recipient)
            failed_count += 1

    campaign.status = "sent"
    campaign.sent_count = sent_count
    campaign.failed_count = failed_count
    campaign.sent_at = datetime.now(timezone.utc)
    campaign.scheduled_at = None
    campaign.scheduled_contact_ids = None
    campaign.schedule_failed_reason = None

    db.commit()

    return {
        "sent": sent_count,
        "failed": failed_count,
        "skipped": skipped_count,
        "total": len(contacts)
    }


def get_whatsapp_recipients(
    db: Session,
    campaign_id: str,
    user_id: uuid.UUID
) -> List[WhatsappCampaignRecipient]:
    campaign = get_whatsapp_campaign(db, campaign_id, user_id)
    if not campaign:
        return []

    return db.query(WhatsappCampaignRecipient).filter(
        WhatsappCampaignRecipient.campaign_id == campaign_id
    ).all()