from sqlalchemy.orm import Session
from app.models.campaign import Campaign, CampaignRecipient
from app.models.contact import Contact
from app.schemas.campaign import CampaignCreate, CampaignUpdate
from app.core.config import settings
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import resend

resend.api_key = settings.RESEND_API_KEY


def get_campaigns(db: Session, user_id: uuid.UUID) -> List[Campaign]:
    return db.query(Campaign).filter(
        Campaign.user_id == user_id
    ).order_by(Campaign.created_at.desc()).all()


def get_campaign(db: Session, campaign_id: str, user_id: uuid.UUID) -> Optional[Campaign]:
    return db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == user_id
    ).first()


def create_campaign(db: Session, campaign_data: CampaignCreate, user_id: uuid.UUID) -> Campaign:
    db_campaign = Campaign(
        user_id=user_id,
        name=campaign_data.name,
        subject=campaign_data.subject,
        body=campaign_data.body,
        status="draft"
    )
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign


def update_campaign(db: Session, campaign_id: str, campaign_data: CampaignUpdate, user_id: uuid.UUID) -> Optional[Campaign]:
    campaign = get_campaign(db, campaign_id, user_id)
    if not campaign:
        return None
    for key, value in campaign_data.model_dump(exclude_unset=True).items():
        setattr(campaign, key, value)
    db.commit()
    db.refresh(campaign)
    return campaign


def delete_campaign(db: Session, campaign_id: str, user_id: uuid.UUID) -> bool:
    campaign = get_campaign(db, campaign_id, user_id)
    if not campaign:
        return False
    db.delete(campaign)
    db.commit()
    return True


def send_campaign(
    db: Session,
    campaign_id: str,
    user_id: uuid.UUID,
    contact_ids: Optional[List[uuid.UUID]] = None
) -> dict:
    campaign = get_campaign(db, campaign_id, user_id)
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

    sent_count = 0
    failed_count = 0

    for contact in contacts:
        if not contact.email:
            continue

        contact_name = f"{contact.first_name or ''} {contact.last_name or ''}".strip()

        # Personalize body
        personalized_body = campaign.body.replace("{{name}}", contact_name)
        personalized_body = personalized_body.replace("{{email}}", contact.email)
        personalized_body = personalized_body.replace("{{company}}", contact.company or "")

        # Build HTML
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            {personalized_body.replace(chr(10), '<br>')}
        </div>
        """

        try:
            resend.Emails.send({
                "from": settings.RESEND_FROM_EMAIL,
                "to": contact.email,
                "subject": campaign.subject,
                "html": html_body,
            })

            # Save recipient record
            recipient = CampaignRecipient(
                campaign_id=campaign.id,
                contact_id=contact.id,
                email=contact.email,
                name=contact_name,
                status="sent",
                sent_at=datetime.now(timezone.utc)
            )
            db.add(recipient)
            sent_count += 1

        except Exception as e:
            recipient = CampaignRecipient(
                campaign_id=campaign.id,
                contact_id=contact.id,
                email=contact.email,
                name=contact_name,
                status="failed"
            )
            db.add(recipient)
            failed_count += 1

    # Update campaign status
    campaign.status = "sent"
    campaign.sent_count = sent_count
    campaign.sent_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "sent": sent_count,
        "failed": failed_count,
        "total": len(contacts)
    }


def get_campaign_recipients(db: Session, campaign_id: str, user_id: uuid.UUID):
    campaign = get_campaign(db, campaign_id, user_id)
    if not campaign:
        return []
    return db.query(CampaignRecipient).filter(
        CampaignRecipient.campaign_id == campaign_id
    ).all()