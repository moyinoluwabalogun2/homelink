"""Add HomeLink sponsored advertising campaigns.

Revision ID: 20261006_0014
Revises: 20260926_0013
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import (
    postgresql,
)


revision: str = "20261006_0014"
down_revision: str | None = (
    "20260926_0013"
)
branch_labels: Sequence[
    str
] | None = None
depends_on: Sequence[
    str
] | None = None


def upgrade() -> None:
    op.create_table(
        "advertisements",
        sa.Column(
            "id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=False,
            server_default=sa.text(
                "gen_random_uuid()"
            ),
        ),
        sa.Column(
            "reference",
            sa.String(length=40),
            nullable=False,
        ),
        sa.Column(
            "management_token_hash",
            sa.String(length=64),
            nullable=False,
        ),
        sa.Column(
            "business_name",
            sa.String(length=160),
            nullable=False,
        ),
        sa.Column(
            "headline",
            sa.String(length=120),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.String(length=500),
            nullable=False,
        ),
        sa.Column(
            "call_to_action",
            sa.String(length=40),
            nullable=False,
        ),
        sa.Column(
            "destination_url",
            sa.String(length=1000),
            nullable=False,
        ),
        sa.Column(
            "contact_email",
            sa.String(length=320),
            nullable=False,
        ),
        sa.Column(
            "contact_phone",
            sa.String(length=40),
            nullable=True,
        ),
        sa.Column(
            "image_url",
            sa.String(length=1000),
            nullable=False,
        ),
        sa.Column(
            "image_public_id",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "placement",
            sa.String(length=14),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=17),
            nullable=False,
            server_default=(
                "payment_pending"
            ),
        ),
        sa.Column(
            "area_id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=True,
        ),
        sa.Column(
            "amount_kobo",
            sa.Integer(),
            nullable=False,
            server_default="500000",
        ),
        sa.Column(
            "currency",
            sa.String(length=3),
            nullable=False,
            server_default="NGN",
        ),
        sa.Column(
            "duration_days",
            sa.Integer(),
            nullable=False,
            server_default="7",
        ),
        sa.Column(
            "preferred_start_date",
            sa.Date(),
            nullable=True,
        ),
        sa.Column(
            "starts_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
        sa.Column(
            "ends_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
        sa.Column(
            "approved_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
        sa.Column(
            "rejected_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
        sa.Column(
            "completed_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
        sa.Column(
            "reviewed_by_user_id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=True,
        ),
        sa.Column(
            "review_notes",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "rejection_reason",
            sa.String(length=1000),
            nullable=True,
        ),
        sa.Column(
            "impression_count",
            sa.BigInteger(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "click_count",
            sa.BigInteger(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "amount_kobo >= 0",
            name=(
                "ck_advertisements_"
                "amount_nonnegative"
            ),
        ),
        sa.CheckConstraint(
            "duration_days > 0",
            name=(
                "ck_advertisements_"
                "duration_positive"
            ),
        ),
        sa.CheckConstraint(
            "impression_count >= 0",
            name=(
                "ck_advertisements_"
                "impressions_nonnegative"
            ),
        ),
        sa.CheckConstraint(
            "click_count >= 0",
            name=(
                "ck_advertisements_"
                "clicks_nonnegative"
            ),
        ),
        sa.CheckConstraint(
            (
                "ends_at IS NULL OR "
                "starts_at IS NOT NULL"
            ),
            name=(
                "ck_advertisements_"
                "end_requires_start"
            ),
        ),
        sa.CheckConstraint(
            (
                "ends_at IS NULL OR "
                "ends_at > starts_at"
            ),
            name=(
                "ck_advertisements_"
                "end_after_start"
            ),
        ),
        sa.CheckConstraint(
            (
                "placement IN "
                "('homepage', "
                "'discovery', "
                "'marketplace', "
                "'listing_detail')"
            ),
            name="advertisement_placement",
        ),
        sa.CheckConstraint(
            (
                "status IN "
                "('payment_pending', "
                "'pending_review', "
                "'changes_requested', "
                "'approved', "
                "'scheduled', "
                "'live', "
                "'completed', "
                "'rejected', "
                "'cancelled', "
                "'refunded')"
            ),
            name="advertisement_status",
        ),
        sa.ForeignKeyConstraint(
            ["area_id"],
            ["areas.id"],
            name=(
                "fk_advertisements_"
                "area_id_areas"
            ),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by_user_id"],
            ["users.id"],
            name=(
                "fk_advertisements_"
                "reviewer_users"
            ),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name="pk_advertisements",
        ),
        sa.UniqueConstraint(
            "reference",
            name=(
                "uq_advertisements_"
                "reference"
            ),
        ),
        sa.UniqueConstraint(
            "management_token_hash",
            name=(
                "uq_advertisements_"
                "management_token_hash"
            ),
        ),
    )

    op.create_index(
        (
            "ix_advertisements_"
            "status_schedule"
        ),
        "advertisements",
        [
            "status",
            "starts_at",
            "ends_at",
        ],
        unique=False,
    )

    op.create_index(
        (
            "ix_advertisements_"
            "placement_status"
        ),
        "advertisements",
        [
            "placement",
            "status",
        ],
        unique=False,
    )

    op.create_index(
        (
            "ix_advertisements_"
            "area_status"
        ),
        "advertisements",
        [
            "area_id",
            "status",
        ],
        unique=False,
    )

    op.create_index(
        (
            "ix_advertisements_"
            "contact_created"
        ),
        "advertisements",
        [
            "contact_email",
            "created_at",
        ],
        unique=False,
    )

    op.create_table(
        "advertisement_payments",
        sa.Column(
            "id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=False,
            server_default=sa.text(
                "gen_random_uuid()"
            ),
        ),
        sa.Column(
            "advertisement_id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=False,
        ),
        sa.Column(
            "reference",
            sa.String(length=120),
            nullable=False,
        ),
        sa.Column(
            "provider",
            sa.String(length=11),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=9),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "amount_kobo",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "currency",
            sa.String(length=3),
            nullable=False,
        ),
        sa.Column(
            "authorization_url",
            sa.String(length=1000),
            nullable=True,
        ),
        sa.Column(
            "access_code",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "provider_transaction_id",
            sa.String(length=120),
            nullable=True,
        ),
        sa.Column(
            "provider_metadata",
            postgresql.JSONB(
                astext_type=sa.Text()
            ),
            nullable=False,
            server_default=sa.text(
                "'{}'::jsonb"
            ),
        ),
        sa.Column(
            "paid_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "amount_kobo >= 0",
            name=(
                "ck_advertisement_"
                "payments_amount_"
                "nonnegative"
            ),
        ),
        sa.CheckConstraint(
            (
                "provider IN "
                "('mock', 'paystack', "
                "'flutterwave')"
            ),
            name=(
                "advertisement_"
                "payment_provider"
            ),
        ),
        sa.CheckConstraint(
            (
                "status IN "
                "('pending', 'success', "
                "'failed', 'abandoned', "
                "'refunded')"
            ),
            name=(
                "advertisement_"
                "payment_status"
            ),
        ),
        sa.ForeignKeyConstraint(
            ["advertisement_id"],
            ["advertisements.id"],
            name=(
                "fk_advertisement_"
                "payments_advertisement"
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name=(
                "pk_advertisement_payments"
            ),
        ),
        sa.UniqueConstraint(
            "reference",
            name=(
                "uq_advertisement_"
                "payments_reference"
            ),
        ),
    )

    op.create_index(
        (
            "ix_advertisement_"
            "payments_ad_created"
        ),
        "advertisement_payments",
        [
            "advertisement_id",
            "created_at",
        ],
        unique=False,
    )

    op.create_index(
        (
            "ix_advertisement_"
            "payments_status_created"
        ),
        "advertisement_payments",
        [
            "status",
            "created_at",
        ],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        (
            "ix_advertisement_"
            "payments_status_created"
        ),
        table_name=(
            "advertisement_payments"
        ),
    )

    op.drop_index(
        (
            "ix_advertisement_"
            "payments_ad_created"
        ),
        table_name=(
            "advertisement_payments"
        ),
    )

    op.drop_table(
        "advertisement_payments"
    )

    op.drop_index(
        (
            "ix_advertisements_"
            "contact_created"
        ),
        table_name="advertisements",
    )

    op.drop_index(
        (
            "ix_advertisements_"
            "area_status"
        ),
        table_name="advertisements",
    )

    op.drop_index(
        (
            "ix_advertisements_"
            "placement_status"
        ),
        table_name="advertisements",
    )

    op.drop_index(
        (
            "ix_advertisements_"
            "status_schedule"
        ),
        table_name="advertisements",
    )

    op.drop_table("advertisements")