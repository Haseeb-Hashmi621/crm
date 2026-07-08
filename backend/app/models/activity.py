from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Float
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

    # AI Sentiment Analysis (Feature #51)
    sentiment = Column(String(20), nullable=True)          # positive | neutral | negative
    sentiment_score = Column(Float, nullable=True)          # -1.0 to 1.0
    sentiment_analyzed_at = Column(DateTime(timezone=True), nullable=True)

    contact = relationship("Contact", lazy="select")