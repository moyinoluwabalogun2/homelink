"""Add durable Cloudinary media cleanup queue.

Revision ID: 20260922_0012
Revises: 20260922_0011
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260922_0012"
down_revision: str | None = "20260922_0011"

branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "media_cleanup_jobs",
        sa.Column(
            "id",
            postgresql.UUID(
                as_uuid=True,
            ),
            nullable=False,
            server_default=sa.text(
                "gen_random_uuid()",
            ),
        ),
        sa.Column(
            "storage_public_id",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "resource_type",
            sa.String(length=16),
            nullable=False,
            server_default="image",
        ),
        sa.Column(
            "delivery_type",
            sa.String(length=32),
            nullable=False,
            server_default="upload",
        ),
        sa.Column(
            "reason",
            sa.String(length=64),
            nullable=False,
        ),
        sa.Column(
            "listing_id",
            postgresql.UUID(
                as_uuid=True,
            ),
            nullable=True,
        ),
        sa.Column(
            "attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "last_error",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "attempts >= 0",
            name=(
                "ck_media_cleanup_jobs_"
                "attempts_nonnegative"
            ),
        ),
        sa.ForeignKeyConstraint(
            [
                "listing_id",
            ],
            [
                "listings.id",
            ],
            name=(
                "fk_media_cleanup_jobs_"
                "listing_id_listings"
            ),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name=(
                "pk_media_cleanup_jobs"
            ),
        ),
        sa.UniqueConstraint(
            "storage_public_id",
            "resource_type",
            "delivery_type",
            name=(
                "uq_media_cleanup_jobs_asset"
            ),
        ),
    )

    op.create_index(
        "ix_media_cleanup_jobs_pending",
        "media_cleanup_jobs",
        [
            "attempts",
            "created_at",
        ],
        unique=False,
    )

    op.create_index(
        "ix_media_cleanup_jobs_listing_id",
        "media_cleanup_jobs",
        [
            "listing_id",
        ],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_media_cleanup_jobs_listing_id",
        table_name="media_cleanup_jobs",
    )

    op.drop_index(
        "ix_media_cleanup_jobs_pending",
        table_name="media_cleanup_jobs",
    )

    op.drop_table(
        "media_cleanup_jobs",
    )