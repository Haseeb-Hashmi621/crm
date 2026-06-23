import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
from sqlalchemy.orm import relationship  # ← add this import if not already there

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String(20), nullable=False, default="employee")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    forms = relationship("Form", back_populates="owner")  # ← add this line