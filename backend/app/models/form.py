from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    fields = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, default=True)
    submit_button_text = Column(String(100), default="Submit")
    success_message = Column(Text, default="Thank you! Your response has been submitted.")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    submissions = relationship("FormSubmission", back_populates="form", cascade="all, delete-orphan")
    owner = relationship("User", back_populates="forms")


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    data = Column(JSON, nullable=False)
    submitter_ip = Column(String(45), nullable=True)
    contact_created = Column(Boolean, default=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    form = relationship("Form", back_populates="submissions")