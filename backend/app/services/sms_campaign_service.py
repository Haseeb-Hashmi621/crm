from sqlalchemy.orm import Session
from app.models.sms_campaign import SmsCampaign, SmsCampaignRecipient
from app.models.contact import Contact
from app.core.config import settings
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from twilio.rest import Client


def format_phone_e164(phone: str, default_country_code: str = "92") -> str:
    cleaned = ''.join(filter(str.isdigit, phone))
    if cleaned.startswith('92') and len(cleaned) == 12:
        return f"+{cleaned}"
    if cleaned.startswith('0') and len(cleaned) == 11:
        return f"+{default_country_code}{cleaned[1:]}"
    if len(cleaned) >= 11:
        return f"+{cleaned}"
    return f"+{cleaned}"


def get_twilio_client():
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def get_sms_campaigns(db: Session, user_id: uuid.UUID) -> List[SmsCampaign]:
    return db.query(SmsCampaign).filter(
        SmsCampaign.user_id == user_id
    ).order_by(SmsCampaign.created_at.desc()).all()


def get_sms_campaign(db: Session, campaign_id: str, user_id: uuid.UUID) -> Optional[SmsCampaign]:
    return db.query(SmsCampaign).filter(
        SmsCampaign.id == campaign_id,
        SmsCampaign.user_id == user_id
    ).first()


def create_sms_campaign(db: Session, name: str, message: str, user_id: uuid.UUID) -> SmsCampaign:
    db_campaign = SmsCampaign(
        user_id=user_id,
        name=name,
        message=message,
        status="draft"
    )
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign


def delete_sms_campaign(db: Session, campaign_id: str, user_id: uuid.UUID) -> bool:
    campaign = get_sms_campaign(db, campaign_id, user_id)
    if not campaign:
        return False
    db.delete(campaign)
    db.commit()
    return True


# ── Scheduling (Priority 5) ───────────────────────────────────────────────────

def schedule_sms_campaign(
    db: Session,
    campaign_id: str,
    user_id: uuid.UUID,
    scheduled_at: datetime,
    contact_ids: Optional[List[uuid.UUID]] = None,
) -> dict:
    campaign = get_sms_campaign(db, campaign_id, user_id)
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


def cancel_sms_schedule(db: Session, campaign_id: str, user_id: uuid.UUID) -> dict:
    campaign = get_sms_campaign(db, campaign_id, user_id)
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


def send_sms_campaign(
    db: Session,
    campaign_id: str,
    user_id: uuid.UUID,
    contact_ids: Optional[List[uuid.UUID]] = None
) -> dict:
    campaign = get_sms_campaign(db, campaign_id, user_id)
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

        try:
            client.messages.create(
                body=personalized,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=format_phone_e164(contact.phone),
            )

            recipient = SmsCampaignRecipient(
                campaign_id=campaign.id,
                contact_id=contact.id,
                phone=contact.phone,
                name=contact_name,
                status="sent",
                sent_at=datetime.now(timezone.utc)
            )
            db.add(recipient)
            sent_count += 1

        except Exception as e:
            recipient = SmsCampaignRecipient(
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


def get_sms_recipients(db: Session, campaign_id: str, user_id: uuid.UUID):
    campaign = get_sms_campaign(db, campaign_id, user_id)
    if not campaign:
        return []

    return db.query(SmsCampaignRecipient).filter(
        SmsCampaignRecipient.campaign_id == campaign_id
    ).all()