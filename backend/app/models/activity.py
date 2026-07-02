from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Activity(Base):
    __tablename__ = "activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=False)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id", ondelete="CASCADE"), nullable=True)
    type = Column(String, default="note")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # True  = sent automatically by the chatbot
    # False = sent by a human agent
    # NULL  = pre-existing rows / inbound messages / unknown
    is_bot = Column(Boolean, nullable=True, default=False)

    contact = relationship("Contact", lazy="select")