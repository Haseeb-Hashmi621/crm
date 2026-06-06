"""add user_id to contacts and deals

Revision ID: e1f2a3b4c5d6
Revises: 0e5b34f239b3
Create Date: 2026-06-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'e1f2a3b4c5d6'
down_revision = '0e5b34f239b3'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='contacts' AND column_name='user_id'"
    ))
    if not result.fetchone():
        op.add_column('contacts', sa.Column('user_id', UUID(as_uuid=True), nullable=True))
        op.execute(sa.text(
            "UPDATE contacts SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL"
        ))
        op.alter_column('contacts', 'user_id', nullable=False)
        op.create_foreign_key('fk_contacts_user_id', 'contacts', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='deals' AND column_name='user_id'"
    ))
    if not result.fetchone():
        op.add_column('deals', sa.Column('user_id', UUID(as_uuid=True), nullable=True))
        op.execute(sa.text(
            "UPDATE deals SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL"
        ))
        op.alter_column('deals', 'user_id', nullable=False)
        op.create_foreign_key('fk_deals_user_id', 'deals', 'users', ['user_id'], ['id'], ondelete='CASCADE')


def downgrade():
    op.drop_constraint('fk_contacts_user_id', 'contacts', type_='foreignkey')
    op.drop_column('contacts', 'user_id')
    op.drop_constraint('fk_deals_user_id', 'deals', type_='foreignkey')
    op.drop_column('deals', 'user_id')