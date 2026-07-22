from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime


class WorkflowAction(BaseModel):
    type: str  # create_task | add_tag | send_notification | send_email
    config: Dict[str, Any] = {}


class WorkflowRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str
    trigger_config: Dict[str, Any] = {}
    actions: List[WorkflowAction] = []
    is_active: bool = True


class WorkflowRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[Dict[str, Any]] = None
    actions: Optional[List[WorkflowAction]] = None
    is_active: Optional[bool] = None


class WorkflowRuleResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    trigger_type: str
    trigger_config: Dict[str, Any] = {}
    actions: List[Dict[str, Any]] = []
    is_active: bool
    run_count: int
    last_run_at: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowRunLogResponse(BaseModel):
    id: UUID
    workflow_id: UUID
    trigger_type: str
    context_summary: Optional[str] = None
    success: bool
    error: Optional[str] = None
    actions_executed: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TriggerTypeInfo(BaseModel):
    id: str
    label: str
    description: str
    config_fields: List[Dict[str, Any]] = []


class ActionTypeInfo(BaseModel):
    id: str
    label: str
    description: str
    config_fields: List[Dict[str, Any]] = []


class WorkflowMetaResponse(BaseModel):
    triggers: List[TriggerTypeInfo]
    actions: List[ActionTypeInfo]