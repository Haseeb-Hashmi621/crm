import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class ChatbotConfig(Base):
    __tablename__ = "chatbot_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)

    enabled = Column(Boolean, nullable=False, default=True)

    # Editable persona/instructions — this is what shapes bot tone and behavior.
    # Kept separate from any hardcoded prompt in the AI endpoints so it can be
    # changed by the client without a code deploy.
    system_prompt = Column(
        Text,
        nullable=False,
        default=(
            "You are a helpful assistant responding to customer messages on WhatsApp "
            "on behalf of this business. Be concise, friendly, and professional. "
            "If you don't know the answer to something, say so honestly and let the "
            "customer know a team member will follow up, rather than guessing."
        ),
    )

    # Sent when the bot cannot generate a confident reply (e.g. AI call fails,
    # or the message is empty/unclear). Kept editable so the client controls
    # the exact wording customers see in a failure case.
    fallback_message = Column(
        Text,
        nullable=False,
        default="Thanks for your message! One of our team members will get back to you shortly.",
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class KnowledgeBaseEntry(Base):
    __tablename__ = "knowledge_base_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)

    # Freeform grouping the client can use however he likes:
    # e.g. "pricing", "faq", "sop", "services". Not enforced against a fixed list
    # on purpose — this is his knowledge base, his categories.
    category = Column(String(100), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())