"""recreate_analytics_insights

Revision ID: d0315cf39f82
Revises: dbad2e8585c1
Create Date: 2026-06-13 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd0315cf39f82'
down_revision: Union[str, None] = '7496e589c0c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add new columns in batch mode
    with op.batch_alter_table('analytics_insights', schema=None) as batch_op:
        batch_op.add_column(sa.Column('channel_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('insight_source', sa.String(), nullable=False, server_default='channel_engine'))
        batch_op.add_column(sa.Column('severity', sa.String(), nullable=False, server_default='Medium'))
        batch_op.add_column(sa.Column('status', sa.String(), nullable=False, server_default='active'))
        batch_op.add_column(sa.Column('entity_type', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('entity_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('engine_version', sa.String(), nullable=False, server_default='1.0'))
        batch_op.add_column(sa.Column('fingerprint', sa.String(), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('description', sa.Text(), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('score', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('evidence_json', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('first_detected_at', sa.DateTime(), nullable=True, server_default=sa.func.now()))
        batch_op.add_column(sa.Column('last_detected_at', sa.DateTime(), nullable=True, server_default=sa.func.now()))

    # 2. Migrate data
    op.execute(
        "UPDATE analytics_insights SET "
        "channel_id = analytics_channel_id, "
        "description = summary, "
        "evidence_json = payload_json"
    )

    # 3. Drop old columns and add fingerprint index
    with op.batch_alter_table('analytics_insights', schema=None) as batch_op:
        batch_op.drop_column('scope')
        batch_op.drop_column('insight_version')
        batch_op.drop_column('payload_version')
        batch_op.drop_column('confidence_score')
        batch_op.drop_column('summary')
        batch_op.drop_column('payload_json')
        batch_op.drop_column('generated_at')
        batch_op.drop_column('expires_at')
        batch_op.drop_column('analytics_channel_id')
        batch_op.create_index('ix_analytics_insights_fingerprint', ['fingerprint'], unique=False)


def downgrade() -> None:
    # 1. Re-add old columns
    with op.batch_alter_table('analytics_insights', schema=None) as batch_op:
        batch_op.add_column(sa.Column('analytics_channel_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('scope', sa.String(), nullable=False, server_default='channel'))
        batch_op.add_column(sa.Column('insight_version', sa.Integer(), nullable=True, server_default='1'))
        batch_op.add_column(sa.Column('payload_version', sa.Integer(), nullable=True, server_default='1'))
        batch_op.add_column(sa.Column('confidence_score', sa.Float(), nullable=True, server_default='1.0'))
        batch_op.add_column(sa.Column('summary', sa.String(), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('payload_json', sa.Text(), nullable=False, server_default='{}'))
        batch_op.add_column(sa.Column('generated_at', sa.DateTime(), nullable=True, server_default=sa.func.now()))
        batch_op.add_column(sa.Column('expires_at', sa.DateTime(), nullable=False, server_default=sa.func.now()))

    # 2. Migrate data back
    op.execute(
        "UPDATE analytics_insights SET "
        "analytics_channel_id = channel_id, "
        "summary = description, "
        "payload_json = COALESCE(evidence_json, '{}')"
    )

    # 3. Drop new columns
    with op.batch_alter_table('analytics_insights', schema=None) as batch_op:
        batch_op.drop_index('ix_analytics_insights_fingerprint')
        batch_op.drop_column('channel_id')
        batch_op.drop_column('insight_source')
        batch_op.drop_column('severity')
        batch_op.drop_column('status')
        batch_op.drop_column('entity_type')
        batch_op.drop_column('entity_id')
        batch_op.drop_column('engine_version')
        batch_op.drop_column('fingerprint')
        batch_op.drop_column('description')
        batch_op.drop_column('score')
        batch_op.drop_column('evidence_json')
        batch_op.drop_column('first_detected_at')
        batch_op.drop_column('last_detected_at')
