"""Sprint 7A-4.6: Prompt Context Optimization

Revision ID: a6871d79b05f
Revises: 7a4500000000
Create Date: 2026-06-09 14:22:14.805207

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6871d79b05f'
down_revision: Union[str, None] = '7a4500000000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('prompt_contexts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('description', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('is_active', sa.Integer(), server_default='1', nullable=True))
    
    # Backfill existing data
    op.execute("UPDATE prompt_contexts SET is_active = 1")


def downgrade() -> None:
    with op.batch_alter_table('prompt_contexts', schema=None) as batch_op:
        batch_op.drop_column('is_active')
        batch_op.drop_column('description')
