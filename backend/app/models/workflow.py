import uuid
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class WorkflowRule(Base):
    __tablename__ = "workflow_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    trigger_type = Column(String(50), nullable=False)
    # contact_created | deal_created | deal_stage_changed | tag_added | form_submitted
    trigger_config = Column(JSON, nullable=False, default=dict)
    # e.g. {"stage": "won"} for deal_stage_changed, {"tag_name": "hot lead"} for tag_added

    actions = Column(JSON, nullable=False, default=list)
    # list of {"type": "create_task", "config": {...}}

    is_active = Column(Boolean, nullable=False, default=True)

    run_count = Column(Integer, nullable=False, default=0)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WorkflowRunLog(Base):
    __tablename__ = "workflow_run_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflow_rules.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    trigger_type = Column(String(50), nullable=False)
    context_summary = Column(String(500), nullable=True)
    success = Column(Boolean, nullable=False, default=True)
    error = Column(Text, nullable=True)
    actions_executed = Column(JSON, nullable=True)  # list of {"type":..., "success":..., "detail":...}

    created_at = Column(DateTime(timezone=True), server_default=func.now())