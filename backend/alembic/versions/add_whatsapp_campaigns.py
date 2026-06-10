"""add whatsapp campaigns tables

Revision ID: l1m2n3o4p5q6
Revises: k1l2m3n4o5p6
Create Date: 2026-06-10

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'l1m2n3o4p5q6'
down_revision: Union[str, Sequence[str], None] = 'k1l2m3n4o5p6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'whatsapp_campaigns',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(), default='draft'),
        sa.Column('sent_count', sa.Integer(), default=0),
        sa.Column('failed_count', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'whatsapp_campaign_recipients',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', UUID(as_uuid=True), nullable=False),
        sa.Column('contact_id', UUID(as_uuid=True), nullable=False),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('status', sa.String(), default='pending'),
        sa.Column('error', sa.String(), nullable=True),
        sa.Column('message_sid', sa.String(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['whatsapp_campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index('ix_whatsapp_recipients_campaign_id', 'whatsapp_campaign_recipients', ['campaign_id'])


def downgrade() -> None:
    op.drop_index('ix_whatsapp_recipients_campaign_id', table_name='whatsapp_campaign_recipients')
    op.drop_table('whatsapp_campaign_recipients')
    op.drop_table('whatsapp_campaigns')