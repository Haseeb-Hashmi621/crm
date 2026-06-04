import uuid

from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class Deal(Base):
    __tablename__ = "deals"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

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

    created_at = Column(DateTime(timezone=True), server_default=func.now())