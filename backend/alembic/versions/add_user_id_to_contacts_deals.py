"""add user_id to contacts and deals

Revision ID: a1b2c3d4e5f6
Revises: 0ea1763fe3f0
Create Date: 2026-06-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'a1b2c3d4e5f6'
down_revision = '0ea1763fe3f0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('contacts', sa.Column(
        'user_id', UUID(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=True
    ))
    op.execute("UPDATE contacts SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL")
    op.alter_column('contacts', 'user_id', nullable=False)

    op.add_column('deals', sa.Column(
        'user_id', UUID(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=True
    ))
    op.execute("UPDATE deals SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL")
    op.alter_column('deals', 'user_id', nullable=False)


def downgrade():
    op.drop_column('contacts', 'user_id')
    op.drop_column('deals', 'user_id')