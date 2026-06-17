"""add emails table for mail hub

Revision ID: n1o2p3q4r5s6
Revises: m1n2o3p4q5r6
Create Date: 2026-06-17

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'n1o2p3q4r5s6'
down_revision: Union[str, Sequence[str], None] = 'm1n2o3p4q5r6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'emails',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('thread_id', UUID(as_uuid=True), nullable=True),  # FK added after table creation
        sa.Column('folder', sa.String(20), nullable=False, server_default='sent'),
        sa.Column('sender_name', sa.String(), nullable=True),
        sa.Column('sender_email', sa.String(), nullable=True),
        sa.Column('recipient_email', sa.String(), nullable=True),
        sa.Column('cc_emails', sa.String(), nullable=True),
        sa.Column('subject', sa.String(), nullable=True),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_starred', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('has_attachments', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('external_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    # Add self-referential FK after table exists
    op.create_foreign_key(
        'fk_emails_thread_id',
        'emails', 'emails',
        ['thread_id'], ['id'],
        ondelete='SET NULL'
    )

    op.create_index('ix_emails_user_id', 'emails', ['user_id'])
    op.create_index('ix_emails_folder', 'emails', ['folder'])
    op.create_index('ix_emails_contact_id', 'emails', ['contact_id'])
    op.create_index('ix_emails_is_read', 'emails', ['is_read'])
    op.create_index('ix_emails_created_at', 'emails', ['created_at'])


def downgrade() -> None:
    op.drop_constraint('fk_emails_thread_id', 'emails', type_='foreignkey')
    op.drop_table('emails')