"""add calendar events table

Revision ID: u1v2w3x4y5z6
Revises: t1u2v3w4x5y6
Create Date: 2026-06-30

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'u1v2w3x4y5z6'
down_revision: Union[str, Sequence[str], None] = 't1u2v3w4x5y6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'calendar_events',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('deal_id', UUID(as_uuid=True), sa.ForeignKey('deals.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('event_type', sa.String(30), nullable=False, server_default='meeting'),
        # meeting | call | reminder | task | other
        sa.Column('status', sa.String(20), nullable=False, server_default='scheduled'),
        # scheduled | completed | cancelled
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('all_day', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('reminder_minutes', sa.Integer(), nullable=True),
        sa.Column('color', sa.String(20), nullable=True, server_default='violet'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_calendar_events_user_id', 'calendar_events', ['user_id'])
    op.create_index('ix_calendar_events_contact_id', 'calendar_events', ['contact_id'])
    op.create_index('ix_calendar_events_start_time', 'calendar_events', ['start_time'])
    op.create_index('ix_calendar_events_status', 'calendar_events', ['status'])


def downgrade() -> None:
    op.drop_index('ix_calendar_events_status', table_name='calendar_events')
    op.drop_index('ix_calendar_events_start_time', table_name='calendar_events')
    op.drop_index('ix_calendar_events_contact_id', table_name='calendar_events')
    op.drop_index('ix_calendar_events_user_id', table_name='calendar_events')
    op.drop_table('calendar_events')