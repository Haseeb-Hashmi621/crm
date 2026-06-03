import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    first_name = Column(String)

    last_name = Column(String)

    email = Column(String)

    phone = Column(String)

    company = Column(String)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id")
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )