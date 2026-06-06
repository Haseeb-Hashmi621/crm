import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.tag import contact_tags

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String)
    phone = Column(String)
    company = Column(String)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tags = relationship("Tag", secondary=contact_tags, lazy="select")