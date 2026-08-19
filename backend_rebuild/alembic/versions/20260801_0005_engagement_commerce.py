"""Add engagement, notifications, credits and payments.

Revision ID: 20260801_0005
Revises: 20260801_0004
Create Date: 2026-08-01
"""

from collections.abc import Sequence
from uuid import UUID

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260801_0005"
down_revision: str | Sequence[str] | None = "20260801_0004"
branch_labels = None
depends_on = None


MARKETPLACE_PLAN_ID = UUID("f55af9a9-1ed8-4a60-9b9e-c5a41354c201")


def timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    ]


def upgrade() -> None:
    op.add_column(
        "listings",
        sa.Column("posting_credit_charged_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "listings",
        sa.Column("posting_credit_source", sa.String(length=20), nullable=True),
    )

    op.create_table(
        "saved_listings",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        *timestamps(),
        sa.ForeignKeyConstraint(
            ["listing_id"], ["listings.id"],
            name="fk_saved_listings_listing_id_listings", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"],
            name="fk_saved_listings_user_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("user_id", "listing_id", name="pk_saved_listings"),
    )

    op.create_table(
        "inquiries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("recipient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inquiry_type", sa.String(length=30), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default=sa.text("'open'")),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], name="fk_inquiries_listing_id_listings", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipient_id"], ["users.id"], name="fk_inquiries_recipient_id_users", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], name="fk_inquiries_sender_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_inquiries"),
    )
    op.create_index("ix_inquiries_sender_created", "inquiries", ["sender_id", "created_at"])
    op.create_index("ix_inquiries_recipient_status", "inquiries", ["recipient_id", "status"])
    op.create_index("ix_inquiries_listing_id", "inquiries", ["listing_id"])

    op.create_table(
        "listing_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.String(length=40), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default=sa.text("'open'")),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], name="fk_listing_reports_listing_id_listings", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.id"], name="fk_listing_reports_reporter_id_users", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"], name="fk_listing_reports_reviewed_by_id_users", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_listing_reports"),
        sa.UniqueConstraint("listing_id", "reporter_id", name="uq_listing_reports_listing_reporter"),
    )
    op.create_index("ix_listing_reports_status_created", "listing_reports", ["status", "created_at"])
    op.create_index("ix_listing_reports_listing_id", "listing_reports", ["listing_id"])

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("notification_type", sa.String(length=40), nullable=False, server_default=sa.text("'system'")),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_notifications_user_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_notifications"),
    )
    op.create_index("ix_notifications_user_read", "notifications", ["user_id", "read_at"])
    op.create_index("ix_notifications_user_created", "notifications", ["user_id", "created_at"])

    op.create_table(
        "listing_credit_balances",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("credit_type", sa.String(length=30), nullable=False),
        sa.Column("free_remaining", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("paid_remaining", sa.Integer(), nullable=False, server_default=sa.text("0")),
        *timestamps(),
        sa.CheckConstraint("free_remaining >= 0", name="ck_listing_credit_balances_free_remaining_nonnegative"),
        sa.CheckConstraint("paid_remaining >= 0", name="ck_listing_credit_balances_paid_remaining_nonnegative"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_listing_credit_balances_user_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_listing_credit_balances"),
        sa.UniqueConstraint("user_id", "credit_type", name="uq_credit_balances_user_type"),
    )

    op.create_table(
        "payment_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("credit_type", sa.String(length=30), nullable=False),
        sa.Column("credit_quantity", sa.Integer(), nullable=False),
        sa.Column("amount_kobo", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default=sa.text("'NGN'")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        *timestamps(),
        sa.CheckConstraint("amount_kobo >= 0", name="ck_payment_plans_amount_kobo_nonnegative"),
        sa.CheckConstraint("credit_quantity > 0", name="ck_payment_plans_credit_quantity_positive"),
        sa.PrimaryKeyConstraint("id", name="pk_payment_plans"),
        sa.UniqueConstraint("code", name="uq_payment_plans_code"),
    )
    op.create_index("ix_payment_plans_active_sort", "payment_plans", ["is_active", "sort_order"])

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reference", sa.String(length=120), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("amount_kobo", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("authorization_url", sa.String(length=1000), nullable=True),
        sa.Column("access_code", sa.String(length=255), nullable=True),
        sa.Column("provider_transaction_id", sa.String(length=120), nullable=True),
        sa.Column("provider_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["plan_id"], ["payment_plans.id"], name="fk_payments_plan_id_payment_plans", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_payments_user_id_users", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_payments"),
        sa.UniqueConstraint("reference", name="uq_payments_reference"),
    )
    op.create_index("ix_payments_user_created", "payments", ["user_id", "created_at"])
    op.create_index("ix_payments_status_created", "payments", ["status", "created_at"])

    op.create_table(
        "payment_webhook_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=False),
        sa.Column("event_key", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.PrimaryKeyConstraint("id", name="pk_payment_webhook_events"),
        sa.UniqueConstraint("event_key", name="uq_payment_webhook_events_event_key"),
    )
    op.create_index("ix_payment_webhook_events_provider_created", "payment_webhook_events", ["provider", "created_at"])

    payment_plans = sa.table(
        "payment_plans",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("code", sa.String()),
        sa.column("name", sa.String()),
        sa.column("description", sa.String()),
        sa.column("credit_type", sa.String()),
        sa.column("credit_quantity", sa.Integer()),
        sa.column("amount_kobo", sa.Integer()),
        sa.column("currency", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("sort_order", sa.Integer()),
    )
    op.bulk_insert(
        payment_plans,
        [
            {
                "id": MARKETPLACE_PLAN_ID,
                "code": "marketplace-five",
                "name": "Marketplace 5-Post Pack",
                "description": "Five additional HomeLink marketplace posting credits.",
                "credit_type": "marketplace",
                "credit_quantity": 5,
                "amount_kobo": 50000,
                "currency": "NGN",
                "is_active": True,
                "sort_order": 1,
            }
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_payment_webhook_events_provider_created", table_name="payment_webhook_events")
    op.drop_table("payment_webhook_events")
    op.drop_index("ix_payments_status_created", table_name="payments")
    op.drop_index("ix_payments_user_created", table_name="payments")
    op.drop_table("payments")
    op.drop_index("ix_payment_plans_active_sort", table_name="payment_plans")
    op.drop_table("payment_plans")
    op.drop_table("listing_credit_balances")
    op.drop_index("ix_notifications_user_created", table_name="notifications")
    op.drop_index("ix_notifications_user_read", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_listing_reports_listing_id", table_name="listing_reports")
    op.drop_index("ix_listing_reports_status_created", table_name="listing_reports")
    op.drop_table("listing_reports")
    op.drop_index("ix_inquiries_listing_id", table_name="inquiries")
    op.drop_index("ix_inquiries_recipient_status", table_name="inquiries")
    op.drop_index("ix_inquiries_sender_created", table_name="inquiries")
    op.drop_table("inquiries")
    op.drop_table("saved_listings")
    op.drop_column("listings", "posting_credit_source")
    op.drop_column("listings", "posting_credit_charged_at")