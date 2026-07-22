import uuid
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class EmailSequence(Base):
    __tablename__ = "email_sequences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="draft")  # draft | active | paused | archived
    exit_on_reply = Column(Boolean, nullable=False, default=True)
    from_name = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    steps = relationship(
        "EmailSequenceStep", back_populates="sequence",
        cascade="all, delete-orphan", order_by="EmailSequenceStep.step_order",
        lazy="selectin",
    )
    enrollments = relationship("SequenceEnrollment", back_populates="sequence", cascade="all, delete-orphan", lazy="select")


class EmailSequenceStep(Base):
    __tablename__ = "email_sequence_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sequence_id = Column(UUID(as_uuid=True), ForeignKey("email_sequences.id", ondelete="CASCADE"), nullable=False)

    step_order = Column(Integer, nullable=False, default=0)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    delay_days = Column(Integer, nullable=False, default=0)
    delay_hours = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sequence = relationship("EmailSequence", back_populates="steps")


class SequenceEnrollment(Base):
    __tablename__ = "sequence_enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sequence_id = Column(UUID(as_uuid=True), ForeignKey("email_sequences.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    status = Column(String(20), nullable=False, default="active")
    # active | paused | completed | cancelled | exited | failed
    current_step_index = Column(Integer, nullable=False, default=0)

    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    next_send_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sequence = relationship("EmailSequence", back_populates="enrollments")
    contact = relationship("Contact", lazy="select")
    sends = relationship("SequenceStepSend", back_populates="enrollment", cascade="all, delete-orphan", lazy="select")


class SequenceStepSend(Base):
    __tablename__ = "sequence_step_sends"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("sequence_enrollments.id", ondelete="CASCADE"), nullable=False)
    step_id = Column(UUID(as_uuid=True), ForeignKey("email_sequence_steps.id", ondelete="CASCADE"), nullable=False)

    status = Column(String(20), nullable=False, default="sent")  # sent | failed
    error = Column(Text, nullable=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

    enrollment = relationship("SequenceEnrollment", back_populates="sends")
    step = relationship("EmailSequenceStep", lazy="select")