"""add_deleted_at_to_asset_inbox

Revision ID: 551819d1e17a
Revises: 44b61249ab41
Create Date: 2026-06-16 15:13:25.741866

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '551819d1e17a'
down_revision: Union[str, None] = '44b61249ab41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('asset_inbox', sa.Column('deleted_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('asset_inbox', 'deleted_at')
