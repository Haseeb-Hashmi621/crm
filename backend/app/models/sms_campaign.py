import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class SmsCampaign(Base):
    __tablename__ = "sms_campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="draft")  # draft | scheduled | sent | failed
    sent_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)

    # ── Scheduling ───────────────────────────────────────────────────────────
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    schedule_failed_reason = Column(Text, nullable=True)


class SmsCampaignRecipient(Base):
    __tablename__ = "sms_campaign_recipients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("sms_campaigns.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    phone = Column(String, nullable=False)
    name = Column(String, nullable=True)
    status = Column(String, default="pending")
    error = Column(String, nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
