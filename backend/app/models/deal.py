import uuid

from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.sql import func

from app.core.database import Base


class Deal(Base):
    __tablename__ = "deals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    value = Column(Float, default=0)
    stage = Column(String, default="new")
    contact_name = Column(String, nullable=True)
    company = Column(String, nullable=True)
    owner = Column(String, nullable=True)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    contact_id = Column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="SET NULL"),
        nullable=True
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # AI Deal Scoring (Feature #50)
    ai_score = Column(Integer, nullable=True)               # 0-100 win-likelihood score
    ai_score_reasoning = Column(Text, nullable=True)         # short natural-language explanation
    ai_score_factors = Column(JSON, nullable=True)           # list of {label, impact, weight}
    ai_scored_at = Column(DateTime(timezone=True), nullable=True)