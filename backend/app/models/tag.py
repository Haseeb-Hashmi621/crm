import uuid

from sqlalchemy import Column
from sqlalchemy import String

from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Tag(Base):
    __tablename__ = "tags"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    name = Column(
        String,
        nullable=False
    )