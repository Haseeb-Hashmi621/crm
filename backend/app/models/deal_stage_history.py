import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class DealStageHistory(Base):
    __tablename__ = "deal_stage_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    from_stage = Column(String, nullable=True)   # null for the deal's initial stage
    to_stage = Column(String, nullable=False)

    entered_at = Column(DateTime(timezone=True), server_default=func.now())