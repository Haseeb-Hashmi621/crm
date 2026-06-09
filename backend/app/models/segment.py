import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class Segment(Base):
    __tablename__ = "segments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    # filters: list of {field, operator, value}
    # e.g. [{"field": "company", "operator": "contains", "value": "Acme"}]
    filters = Column(JSON, nullable=False, default=list)
    color = Column(String, nullable=True, default="violet")
    created_at = Column(DateTime(timezone=True), server_default=func.now())