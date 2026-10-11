"""Add indexes for bounded listing and engagement queries.

Revision ID: 20260926_0013
Revises: 20260922_0012
Create Date: 2026-09-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260926_0013"
down_revision: str | None = "20260922_0012"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # Public discovery always excludes soft-deleted rows and sorts
    # published listings by featured state and publication time.
    op.create_index(
        "ix_listings_public_discovery",
        "listings",
        [
            "listing_type",
            "area_id",
            sa.text("is_featured DESC"),
            sa.text("published_at DESC"),
        ],
        unique=False,
        postgresql_where=sa.text(
            "status = 'published' AND deleted_at IS NULL"
        ),
    )

    # My Listings excludes deleted rows and returns newest first.
    op.create_index(
        "ix_listings_owner_active_created",
        "listings",
        [
            "owner_id",
            sa.text("created_at DESC"),
        ],
        unique=False,
        postgresql_where=sa.text(
            "deleted_at IS NULL"
        ),
    )

    # Recently Deleted is bounded by owner and ordered by deletion time.
    op.create_index(
        "ix_listings_owner_deleted_recovery",
        "listings",
        [
            "owner_id",
            sa.text("deleted_at DESC"),
        ],
        unique=False,
        postgresql_where=sa.text(
            "deleted_at IS NOT NULL"
        ),
    )

    op.create_index(
        "ix_saved_listings_user_created",
        "saved_listings",
        [
            "user_id",
            sa.text("created_at DESC"),
        ],
        unique=False,
    )

    op.create_index(
        "ix_listing_reports_reporter_created",
        "listing_reports",
        [
            "reporter_id",
            sa.text("created_at DESC"),
        ],
        unique=False,
    )

    op.create_index(
        "ix_agent_profiles_status_created",
        "agent_profiles",
        [
            "status",
            sa.text("created_at DESC"),
        ],
        unique=False,
        postgresql_where=sa.text(
            "deleted_at IS NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_agent_profiles_status_created",
        table_name="agent_profiles",
    )

    op.drop_index(
        "ix_listing_reports_reporter_created",
        table_name="listing_reports",
    )

    op.drop_index(
        "ix_saved_listings_user_created",
        table_name="saved_listings",
    )

    op.drop_index(
        "ix_listings_owner_deleted_recovery",
        table_name="listings",
    )

    op.drop_index(
        "ix_listings_owner_active_created",
        table_name="listings",
    )

    op.drop_index(
        "ix_listings_public_discovery",
        table_name="listings",
    )