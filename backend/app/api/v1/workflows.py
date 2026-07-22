from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.workflow import (
    WorkflowRuleCreate, WorkflowRuleUpdate, WorkflowRuleResponse,
    WorkflowRunLogResponse, WorkflowMetaResponse
)
from app.services.workflow_service import (
    get_rules, get_rule, create_rule, update_rule, delete_rule, get_run_logs, get_meta
)
from typing import List

router = APIRouter()


@router.get("/meta", response_model=WorkflowMetaResponse)
def workflow_meta():
    return get_meta()


@router.get("/", response_model=List[WorkflowRuleResponse])
def list_rules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_rules(db, current_user.id)


@router.post("/", response_model=WorkflowRuleResponse)
def add_rule(data: WorkflowRuleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return create_rule(db, data, current_user.id)


@router.get("/{rule_id}", response_model=WorkflowRuleResponse)
def get_one_rule(rule_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rule = get_rule(db, rule_id, current_user.id)
    if not rule:
        raise HTTPException(status_code=404, detail="Workflow rule not found")
    return rule


@router.patch("/{rule_id}", response_model=WorkflowRuleResponse)
def edit_rule(rule_id: str, data: WorkflowRuleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rule = update_rule(db, rule_id, data, current_user.id)
    if not rule:
        raise HTTPException(status_code=404, detail="Workflow rule not found")
    return rule


@router.delete("/{rule_id}")
def remove_rule(rule_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = delete_rule(db, rule_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Workflow rule not found")
    return {"message": "Workflow rule deleted"}


@router.get("/{rule_id}/logs", response_model=List[WorkflowRunLogResponse])
def list_logs(rule_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_run_logs(db, rule_id, current_user.id)