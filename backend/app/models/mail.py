import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Email(Base):
    __tablename__ = "emails"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)

    # Folder: inbox | sent | drafts | trash
    folder = Column(String(20), nullable=False, default="sent")

    # Email fields
    sender_name = Column(String, nullable=True)
    sender_email = Column(String, nullable=True)
    recipient_email = Column(String, nullable=True)
    cc_emails = Column(String, nullable=True)    # comma-separated
    subject = Column(String, nullable=True)
    body = Column(Text, nullable=True)

    # Threading — reply/forward links to original email id
    thread_id = Column(UUID(as_uuid=True), ForeignKey("emails.id", ondelete="SET NULL"), nullable=True)

    # State
    is_read = Column(Boolean, default=False, nullable=False)
    is_starred = Column(Boolean, default=False, nullable=False)
    has_attachments = Column(Boolean, default=False, nullable=False)

    # External message id (for Resend tracking)
    external_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    contact = relationship("Contact", lazy="select")
    thread = relationship("Email", foreign_keys=[thread_id], lazy="select", uselist=False)