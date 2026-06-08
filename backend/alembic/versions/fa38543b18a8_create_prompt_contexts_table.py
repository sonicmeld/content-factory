"""create prompt contexts table

Revision ID: fa38543b18a8
Revises: a7b3c1d9e4f0
Create Date: 2026-06-08 22:02:29.307274

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa38543b18a8'
down_revision: Union[str, None] = 'a7b3c1d9e4f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'prompt_contexts',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('channel_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('topic', sa.String(), nullable=True),
        sa.Column('keywords', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('prompt_contexts')

