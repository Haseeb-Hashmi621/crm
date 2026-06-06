"""add user_id to tags and contact_tags junction table

Revision ID: 0e5b34f239b3
Revises: b1c2d3e4f5a6
Create Date: 2026-06-06

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = '0e5b34f239b3'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create contact_tags junction table if it doesn't exist
    conn = op.get_bind()
    
    result = conn.execute(sa.text(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_name='contact_tags'"
    ))
    if not result.fetchone():
        op.create_table(
            'contact_tags',
            sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id'), primary_key=True),
            sa.Column('tag_id', UUID(as_uuid=True), sa.ForeignKey('tags.id'), primary_key=True),
        )

    # Add user_id to tags if it doesn't exist
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='tags' AND column_name='user_id'"
    ))
    if not result.fetchone():
        op.add_column('tags', sa.Column('user_id', UUID(as_uuid=True), nullable=True))
        op.execute(sa.text(
            "UPDATE tags SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL"
        ))
        op.alter_column('tags', 'user_id', nullable=False)
        op.create_foreign_key('fk_tags_user_id', 'tags', 'users', ['user_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_tags_user_id', 'tags', type_='foreignkey')
    op.drop_column('tags', 'user_id')
    op.drop_table('contact_tags')