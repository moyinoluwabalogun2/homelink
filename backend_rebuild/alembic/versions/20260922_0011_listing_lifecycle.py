"""Add listing completion and recovery lifecycle.

Revision ID: 20260922_0011
Revises: 20260918_0010
Create Date: 2026-09-22
"""

from collections.abc import (
    Sequence,
)

import sqlalchemy as sa

from alembic import op


revision: str = (
    "20260922_0011"
)

down_revision: (
    str
    | Sequence[str]
    | None
) = (
    "20260918_0010"
)

branch_labels: (
    str
    | Sequence[str]
    | None
) = None

depends_on: (
    str
    | Sequence[str]
    | None
) = None


def upgrade() -> None:
    # Records when a published listing was marked sold or rented.
    #
    # Credit fields are deliberately not modified by this migration.
    op.add_column(
        "listings",
        sa.Column(
            "completed_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=True,
        ),
    )

    # Stores the status that existed immediately before a user
    # soft-deleted a listing.
    #
    # This allows a listing restored within the recovery period
    # to return to the correct state.
    op.add_column(
        "listings",
        sa.Column(
            "archived_from_status",
            sa.String(
                length=32,
            ),
            nullable=True,
        ),
    )

    # Records when Cloudinary media becomes eligible for cleanup.
    #
    # The cleanup worker will never purge media before this value.
    op.add_column(
        "listings",
        sa.Column(
            "media_purge_after",
            sa.DateTime(
                timezone=True,
            ),
            nullable=True,
        ),
    )

    # Supports the owner's Recently Deleted view without requiring
    # a full scan of all listings.
    op.create_index(
        "ix_listings_owner_deleted_at",
        "listings",
        [
            "owner_id",
            "deleted_at",
        ],
        unique=False,
    )

    # Supports the maintenance task that finds media whose recovery
    # period has ended.
    op.create_index(
        "ix_listings_media_purge_after",
        "listings",
        [
            "media_purge_after",
        ],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_listings_media_purge_after",
        table_name="listings",
    )

    op.drop_index(
        "ix_listings_owner_deleted_at",
        table_name="listings",
    )

    op.drop_column(
        "listings",
        "media_purge_after",
    )

    op.drop_column(
        "listings",
        "archived_from_status",
    )

    op.drop_column(
        "listings",
        "completed_at",
    )