"""add email sequences (drip campaigns) tables

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'email_sequences',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        # draft | active | paused | archived
        sa.Column('exit_on_reply', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('from_name', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_email_sequences_user_id', 'email_sequences', ['user_id'])

    op.create_table(
        'email_sequence_steps',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('sequence_id', UUID(as_uuid=True), sa.ForeignKey('email_sequences.id', ondelete='CASCADE'), nullable=False),
        sa.Column('step_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('delay_days', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('delay_hours', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_email_sequence_steps_sequence_id', 'email_sequence_steps', ['sequence_id'])

    op.create_table(
        'sequence_enrollments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('sequence_id', UUID(as_uuid=True), sa.ForeignKey('email_sequences.id', ondelete='CASCADE'), nullable=False),
        sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        # active | paused | completed | cancelled | exited | failed
        sa.Column('current_step_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('next_send_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_sequence_enrollments_sequence_id', 'sequence_enrollments', ['sequence_id'])
    op.create_index('ix_sequence_enrollments_contact_id', 'sequence_enrollments', ['contact_id'])
    op.create_index('ix_sequence_enrollments_status', 'sequence_enrollments', ['status'])
    op.create_index('ix_sequence_enrollments_next_send_at', 'sequence_enrollments', ['next_send_at'])

    op.create_table(
        'sequence_step_sends',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('enrollment_id', UUID(as_uuid=True), sa.ForeignKey('sequence_enrollments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('step_id', UUID(as_uuid=True), sa.ForeignKey('email_sequence_steps.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='sent'),  # sent | failed
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_sequence_step_sends_enrollment_id', 'sequence_step_sends', ['enrollment_id'])


def downgrade() -> None:
    op.drop_index('ix_sequence_step_sends_enrollment_id', table_name='sequence_step_sends')
    op.drop_table('sequence_step_sends')

    op.drop_index('ix_sequence_enrollments_next_send_at', table_name='sequence_enrollments')
    op.drop_index('ix_sequence_enrollments_status', table_name='sequence_enrollments')
    op.drop_index('ix_sequence_enrollments_contact_id', table_name='sequence_enrollments')
    op.drop_index('ix_sequence_enrollments_sequence_id', table_name='sequence_enrollments')
    op.drop_table('sequence_enrollments')

    op.drop_index('ix_email_sequence_steps_sequence_id', table_name='email_sequence_steps')
    op.drop_table('email_sequence_steps')

    op.drop_index('ix_email_sequences_user_id', table_name='email_sequences')
    op.drop_table('email_sequences')