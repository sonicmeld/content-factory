"""update_assets_schema

Revision ID: 62fbd0ba7dbc
Revises: d41dd0225113
Create Date: 2026-06-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '62fbd0ba7dbc'
down_revision = 'd41dd0225113'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Use batch_alter_table for SQLite compatibility when dropping/renaming columns.
    # This automatically creates a temporary table, copies data, and renames it.
    with op.batch_alter_table('assets', schema=None) as batch_op:
        # Add new non-nullable columns with a server_default so existing rows don't fail
        batch_op.add_column(sa.Column('file_size', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('mime_type', sa.String(), nullable=False, server_default='application/octet-stream'))
        
        # Rename columns (SQLite handles this via the batch copy mechanism)
        batch_op.alter_column('type', new_column_name='asset_type', existing_type=sa.String(), existing_nullable=False)
        batch_op.alter_column('filepath', new_column_name='file_path', existing_type=sa.String(), existing_nullable=False)
        
        # Allow channel_id to be nullable for shared assets
        batch_op.alter_column('channel_id', existing_type=sa.String(), nullable=True)
        
        # Drop the removed column
        batch_op.drop_column('tags')

def downgrade() -> None:
    with op.batch_alter_table('assets', schema=None) as batch_op:
        # Re-add tags column
        batch_op.add_column(sa.Column('tags', sa.String(), nullable=True))
        
        # Revert column renames
        batch_op.alter_column('asset_type', new_column_name='type', existing_type=sa.String(), existing_nullable=False)
        batch_op.alter_column('file_path', new_column_name='filepath', existing_type=sa.String(), existing_nullable=False)
        
        # Revert channel_id nullability
        batch_op.alter_column('channel_id', existing_type=sa.String(), nullable=False)
        
        # Drop new columns
        batch_op.drop_column('mime_type')
        batch_op.drop_column('file_size')
