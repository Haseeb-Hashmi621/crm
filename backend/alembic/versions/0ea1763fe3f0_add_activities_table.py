"""add activities table

Revision ID: 0ea1763fe3f0
Revises: c8c21a93cf24
Create Date: 2026-06-04 10:02:47.331758

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ea1763fe3f0'
down_revision: Union[str, Sequence[str], None] = 'c8c21a93cf24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'activities',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('contact_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_activities_contact_id', 'activities', ['contact_id'])


def downgrade() -> None:
    op.drop_index('ix_activities_contact_id', table_name='activities')
    op.drop_table('activities')