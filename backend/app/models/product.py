import uuid
from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sku = Column(String(100), nullable=True)           # Stock Keeping Unit code
    category = Column(String(100), nullable=True)
    unit = Column(String(50), nullable=True)           # e.g. "hour", "unit", "month"
    price = Column(Float, nullable=False, default=0.0)
    cost = Column(Float, nullable=True)                # for margin calculation
    currency = Column(String(10), nullable=False, default="USD")
    is_active = Column(Boolean, nullable=False, default=True)
    stock_qty = Column(Integer, nullable=True)         # None = unlimited/service

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())