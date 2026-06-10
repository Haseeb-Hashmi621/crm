import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class WhatsappCampaign(Base):
    __tablename__ = "whatsapp_campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="draft")
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)


class WhatsappCampaignRecipient(Base):
    __tablename__ = "whatsapp_campaign_recipients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("whatsapp_campaigns.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    phone = Column(String, nullable=False)
    name = Column(String, nullable=True)
    status = Column(String, default="pending")
    error = Column(String, nullable=True)
    message_sid = Column(String, nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)