"""Add agent verification document retention fields.

Revision ID: 20260817_0008
Revises: 20260816_0007
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260817_0008"
down_revision: str | None = "20260816_0007"

branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # ---------------------------------------------------------
    # VERIFICATION DOCUMENT STORAGE METADATA
    # ---------------------------------------------------------

    op.add_column(
        "agent_verification_documents",
        sa.Column(
            "file_format",
            sa.String(length=32),
            nullable=True,
        ),
    )

    op.add_column(
        "agent_verification_documents",
        sa.Column(
            "storage_resource_type",
            sa.String(length=16),
            nullable=False,
            server_default="image",
        ),
    )

    op.add_column(
        "agent_verification_documents",
        sa.Column(
            "storage_delivery_type",
            sa.String(length=32),
            nullable=False,
            server_default="upload",
        ),
    )

    # Exact time the admin reviewed this document/application.
    # Retention is calculated from this timestamp rather than
    # from created_at.
    op.add_column(
        "agent_verification_documents",
        sa.Column(
            "reviewed_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
    )

    # Once the Cloudinary asset is permanently removed, we keep
    # the DB row as an audit record and record when it was purged.
    op.add_column(
        "agent_verification_documents",
        sa.Column(
            "purged_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
    )

    # After Cloudinary cleanup there should be no usable file URL.
    # The verification metadata itself remains in PostgreSQL.
    op.alter_column(
        "agent_verification_documents",
        "file_url",
        existing_type=sa.Text(),
        nullable=True,
    )

    # ---------------------------------------------------------
    # BACKFILL OLD REVIEWED DOCUMENTS
    #
    # Existing approved/rejected records should also participate
    # in retention instead of being retained forever.
    # ---------------------------------------------------------

    op.execute(
        """
        UPDATE agent_verification_documents AS document
        SET reviewed_at = COALESCE(
            profile.approved_at,
            profile.updated_at
        )
        FROM agent_profiles AS profile
        WHERE
            document.agent_profile_id = profile.id
            AND document.reviewed_at IS NULL
            AND document.status IN (
                'approved',
                'rejected'
            )
        """
    )

    # Existing uploads were created using Cloudinary's normal
    # "upload" delivery type. New verification uploads will later
    # explicitly use "authenticated".
    op.execute(
        """
        UPDATE agent_verification_documents
        SET storage_delivery_type = 'upload'
        WHERE storage_delivery_type IS NULL
        """
    )

    op.create_index(
        "ix_agent_documents_retention",
        "agent_verification_documents",
        [
            "purged_at",
            "reviewed_at",
        ],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_agent_documents_retention",
        table_name=(
            "agent_verification_documents"
        ),
    )

    # A purged record no longer has a file URL, so restoring the
    # old NOT NULL rule requires a harmless placeholder.
    op.execute(
        """
        UPDATE agent_verification_documents
        SET file_url = ''
        WHERE file_url IS NULL
        """
    )

    op.alter_column(
        "agent_verification_documents",
        "file_url",
        existing_type=sa.Text(),
        nullable=False,
    )

    op.drop_column(
        "agent_verification_documents",
        "purged_at",
    )

    op.drop_column(
        "agent_verification_documents",
        "reviewed_at",
    )

    op.drop_column(
        "agent_verification_documents",
        "storage_delivery_type",
    )

    op.drop_column(
        "agent_verification_documents",
        "storage_resource_type",
    )

    op.drop_column(
        "agent_verification_documents",
        "file_format",
    )