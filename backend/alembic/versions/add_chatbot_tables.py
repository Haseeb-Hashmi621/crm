"""add chatbot config, knowledge base, and bot-message tracking

revision = "v1w2x3y4z5a6"
down_revision = "u1v2w3x4y5z6"
Create Date: 2026-07-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'v1w2x3y4z5a6'
down_revision: Union[str, Sequence[str], None] = 'u1v2w3x4y5z6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── chatbot_configs ──────────────────────────────────────────────────────
    op.create_table(
        'chatbot_configs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('system_prompt', sa.Text(), nullable=False),
        sa.Column('fallback_message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_chatbot_configs_user_id', 'chatbot_configs', ['user_id'], unique=True)

    # ── knowledge_base_entries ───────────────────────────────────────────────
    op.create_table(
        'knowledge_base_entries',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_knowledge_base_entries_user_id', 'knowledge_base_entries', ['user_id'])
    op.create_index('ix_knowledge_base_entries_is_active', 'knowledge_base_entries', ['is_active'])

    # ── contacts.chatbot_enabled — per-conversation human handoff switch ────
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='contacts' AND column_name='chatbot_enabled'"
    ))
    if not result.fetchone():
        op.add_column('contacts', sa.Column('chatbot_enabled', sa.Boolean(), nullable=False, server_default='true'))

    # ── activities.is_bot — distinguishes bot-sent from human-sent messages ─
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='activities' AND column_name='is_bot'"
    ))
    if not result.fetchone():
        op.add_column('activities', sa.Column('is_bot', sa.Boolean(), nullable=True, server_default=sa.text('false')))


def downgrade() -> None:
    op.drop_column('activities', 'is_bot')
    op.drop_column('contacts', 'chatbot_enabled')
    op.drop_index('ix_knowledge_base_entries_is_active', table_name='knowledge_base_entries')
    op.drop_index('ix_knowledge_base_entries_user_id', table_name='knowledge_base_entries')
    op.drop_table('knowledge_base_entries')
    op.drop_index('ix_chatbot_configs_user_id', table_name='chatbot_configs')
    op.drop_table('chatbot_configs')