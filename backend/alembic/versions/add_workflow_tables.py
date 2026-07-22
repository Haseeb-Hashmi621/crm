"""add workflow automation tables

Revision ID: c3d4e5f6a7b8
Revises: z1a2b3c4d5e6
Create Date: 2026-07-13

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'z1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'workflow_rules',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('trigger_type', sa.String(50), nullable=False),
        sa.Column('trigger_config', JSON(), nullable=False, server_default='{}'),
        sa.Column('actions', JSON(), nullable=False, server_default='[]'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('run_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_workflow_rules_user_id', 'workflow_rules', ['user_id'])
    op.create_index('ix_workflow_rules_trigger_type', 'workflow_rules', ['trigger_type'])

    op.create_table(
        'workflow_run_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('workflow_id', UUID(as_uuid=True), sa.ForeignKey('workflow_rules.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('trigger_type', sa.String(50), nullable=False),
        sa.Column('context_summary', sa.String(500), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('actions_executed', JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_workflow_run_logs_workflow_id', 'workflow_run_logs', ['workflow_id'])
    op.create_index('ix_workflow_run_logs_user_id', 'workflow_run_logs', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_workflow_run_logs_user_id', table_name='workflow_run_logs')
    op.drop_index('ix_workflow_run_logs_workflow_id', table_name='workflow_run_logs')
    op.drop_table('workflow_run_logs')
    op.drop_index('ix_workflow_rules_trigger_type', table_name='workflow_rules')
    op.drop_index('ix_workflow_rules_user_id', table_name='workflow_rules')
    op.drop_table('workflow_rules')