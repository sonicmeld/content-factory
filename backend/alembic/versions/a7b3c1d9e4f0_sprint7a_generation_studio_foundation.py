"""Sprint 7A-1: Add combo fields to channels and create package_generations table

Revision ID: a7b3c1d9e4f0
Revises: d41dd0225113
Create Date: 2026-06-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b3c1d9e4f0'
down_revision: Union[str, None] = 'f5ff57d07724'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 9Router Combo fields to channels
    with op.batch_alter_table('channels', schema=None) as batch_op:
        batch_op.add_column(sa.Column('metadata_combo', sa.String(), nullable=True, server_default=''))
        batch_op.add_column(sa.Column('thumbnail_combo', sa.String(), nullable=True, server_default=''))
        batch_op.add_column(sa.Column('footage_combo', sa.String(), nullable=True, server_default=''))

    # Create package_generations table
    op.create_table(
        'package_generations',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('package_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('thumbnail_path', sa.String(), nullable=True),
        sa.Column('metadata_status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('thumbnail_status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    # Drop package_generations table
    op.drop_table('package_generations')

    # Remove combo columns from channels
    with op.batch_alter_table('channels', schema=None) as batch_op:
        batch_op.drop_column('footage_combo')
        batch_op.drop_column('thumbnail_combo')
        batch_op.drop_column('metadata_combo')
