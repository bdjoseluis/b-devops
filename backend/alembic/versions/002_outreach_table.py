"""outreach table + email_source + follow_up columns

Revision ID: 002
Revises: 001
Create Date: 2026-05-31
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('outreach',
        sa.Column('id',                sa.Text, primary_key=True, server_default=sa.text('gen_random_uuid()::text')),
        sa.Column('name',              sa.Text, nullable=False),
        sa.Column('email',             sa.Text, server_default=''),
        sa.Column('email_source',      sa.Text, server_default=''),
        sa.Column('phone',             sa.Text, server_default=''),
        sa.Column('website',           sa.Text, server_default=''),
        sa.Column('address',           sa.Text, server_default=''),
        sa.Column('sector',            sa.Text, server_default=''),
        sa.Column('opportunity_score', sa.Integer, server_default='0'),
        sa.Column('opportunity_label', sa.Text, server_default=''),
        sa.Column('web_issues',        sa.Text, server_default='[]'),  # JSON stored as text
        sa.Column('tech_stack',        sa.Text, server_default='[]'),
        sa.Column('source',            sa.Text, server_default='prospector'),
        sa.Column('status',            sa.Text, server_default='discovered'),
        sa.Column('generated_subject', sa.Text, server_default=''),
        sa.Column('generated_email',   sa.Text, server_default=''),
        sa.Column('sent_at',           sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('follow_up_at',      sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('notes',             sa.Text, server_default=''),
        sa.Column('created_at',        sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_outreach_status', 'outreach', ['status'])
    op.create_index('idx_outreach_score',  'outreach', ['opportunity_score'])


def downgrade() -> None:
    op.drop_table('outreach')
