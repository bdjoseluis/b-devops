"""initial schema — users, clients, refresh_tokens

Revision ID: 001
Revises:
Create Date: 2026-05-30
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto')

    op.create_table('users',
        sa.Column('id',            sa.Text, primary_key=True, server_default=sa.text('gen_random_uuid()::text')),
        sa.Column('username',      sa.Text, nullable=False, unique=True),
        sa.Column('email',         sa.Text, nullable=False, unique=True),
        sa.Column('password_hash', sa.Text, nullable=False),
        sa.Column('role',          sa.Text, nullable=False, server_default='user'),
        sa.Column('status',        sa.Text, nullable=False, server_default='pending'),
        sa.Column('created_at',    sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('approved_at',   sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('approved_by',   sa.Text, nullable=True),
    )

    op.create_table('clients',
        sa.Column('id',               sa.Text, primary_key=True, server_default=sa.text('gen_random_uuid()::text')),
        sa.Column('nombre',           sa.Text, nullable=False),
        sa.Column('empresa',          sa.Text, server_default=''),
        sa.Column('email',            sa.Text, server_default=''),
        sa.Column('telefono',         sa.Text, server_default=''),
        sa.Column('web',              sa.Text, server_default=''),
        sa.Column('sector',           sa.Text, server_default='Tecnología'),
        sa.Column('estado',           sa.Text, server_default='Prospecto'),
        sa.Column('servicios',        sa.Text, server_default='[]'),
        sa.Column('notas',            sa.Text, server_default=''),
        sa.Column('valor_estimado',   sa.Float, server_default='0'),
        sa.Column('estrella',         sa.Boolean, server_default='false'),
        sa.Column('fuente',           sa.Text, server_default='bdev-platform'),
        sa.Column('fecha_creacion',   sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('ultima_actividad', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
    )

    op.create_table('refresh_tokens',
        sa.Column('id',         sa.Text, primary_key=True, server_default=sa.text('gen_random_uuid()::text')),
        sa.Column('user_id',    sa.Text, nullable=False),
        sa.Column('token_hash', sa.Text, nullable=False, unique=True),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('revoked',    sa.Boolean, server_default='false'),
    )
    op.create_index('idx_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
    op.create_index('idx_clients_estado',         'clients',        ['estado'])
    op.create_index('idx_clients_fuente',         'clients',        ['fuente'])


def downgrade() -> None:
    op.drop_table('refresh_tokens')
    op.drop_table('clients')
    op.drop_table('users')
