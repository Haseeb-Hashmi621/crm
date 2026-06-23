"""add forms tables

Revision ID: t1u2v3w4x5y6
Revises: s1t2u3v4w5x6
Create Date: 2026-06-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, UUID

revision = 't1u2v3w4x5y6'
down_revision = 's1t2u3v4w5x6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'forms',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('fields', JSON, nullable=False, server_default='[]'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('submit_button_text', sa.String(100), nullable=False, server_default='Submit'),
        sa.Column('success_message', sa.Text(), nullable=False, server_default='Thank you! Your response has been submitted.'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_forms_id', 'forms', ['id'])
    op.create_index('ix_forms_user_id', 'forms', ['user_id'])

    op.create_table(
        'form_submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('form_id', sa.Integer(), sa.ForeignKey('forms.id'), nullable=False),
        sa.Column('data', JSON, nullable=False, server_default='{}'),
        sa.Column('submitter_ip', sa.String(45), nullable=True),
        sa.Column('contact_created', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_form_submissions_id', 'form_submissions', ['id'])
    op.create_index('ix_form_submissions_form_id', 'form_submissions', ['form_id'])


def downgrade():
    op.drop_index('ix_form_submissions_form_id', table_name='form_submissions')
    op.drop_index('ix_form_submissions_id', table_name='form_submissions')
    op.drop_table('form_submissions')
    op.drop_index('ix_forms_user_id', table_name='forms')
    op.drop_index('ix_forms_id', table_name='forms')
    op.drop_table('forms')