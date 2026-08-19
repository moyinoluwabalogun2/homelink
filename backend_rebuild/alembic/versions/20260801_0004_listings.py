"""Create listings and subtype tables.

Revision ID: 20260801_0004
Revises: 20260801_0003
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260801_0004"
down_revision: str | Sequence[str] | None = "20260801_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campus_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("listing_type", sa.String(length=30), nullable=False),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("slug", sa.String(length=260), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("price", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default=sa.text("'NGN'")),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'draft'")),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("featured_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("contact_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("price >= 0", name="ck_listings_price_nonnegative"),
        sa.CheckConstraint("view_count >= 0", name="ck_listings_view_count_nonnegative"),
        sa.CheckConstraint("contact_count >= 0", name="ck_listings_contact_count_nonnegative"),
        sa.ForeignKeyConstraint(["approved_by_id"], ["users.id"], name="fk_listings_approved_by_id_users", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["area_id"], ["areas.id"], name="fk_listings_area_id_areas", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["campus_id"], ["campuses.id"], name="fk_listings_campus_id_campuses", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], name="fk_listings_owner_id_users", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_listings"),
        sa.UniqueConstraint("slug", name="uq_listings_slug"),
    )
    op.create_index("ix_listings_public_search", "listings", ["listing_type", "status", "area_id"])
    op.create_index("ix_listings_owner_status", "listings", ["owner_id", "status"])
    op.create_index("ix_listings_featured", "listings", ["is_featured", "featured_until"])
    op.create_index("ix_listings_created_at", "listings", ["created_at"])

    op.create_table(
        "listing_media",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("media_type", sa.String(length=20), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("storage_public_id", sa.String(length=255), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_cover", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("sort_order >= 0", name="ck_listing_media_sort_order_nonnegative"),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], name="fk_listing_media_listing_id_listings", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_listing_media"),
    )
    op.create_index("ix_listing_media_listing_order", "listing_media", ["listing_id", "sort_order"])

    op.create_table(
        "rental_details",
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("rent_period", sa.String(length=30), nullable=False),
        sa.Column("bedrooms", sa.Integer(), nullable=True),
        sa.Column("bathrooms", sa.Integer(), nullable=True),
        sa.Column("toilets", sa.Integer(), nullable=True),
        sa.Column("is_furnished", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("caution_fee", sa.Numeric(14, 2), nullable=True),
        sa.Column("service_charge", sa.Numeric(14, 2), nullable=True),
        sa.Column("distance_to_campus_km", sa.Numeric(8, 2), nullable=True),
        sa.Column("address", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], name="fk_rental_details_listing_id_listings", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("listing_id", name="pk_rental_details"),
    )

    op.create_table(
        "buy_property_details",
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("property_condition", sa.String(length=40), nullable=False),
        sa.Column("bedrooms", sa.Integer(), nullable=True),
        sa.Column("bathrooms", sa.Integer(), nullable=True),
        sa.Column("toilets", sa.Integer(), nullable=True),
        sa.Column("land_size_sqm", sa.Numeric(14, 2), nullable=True),
        sa.Column("title_document", sa.String(length=180), nullable=True),
        sa.Column("address", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], name="fk_buy_property_details_listing_id_listings", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("listing_id", name="pk_buy_property_details"),
    )

    op.create_table(
        "marketplace_details",
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("condition", sa.String(length=30), nullable=False),
        sa.Column("is_negotiable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], name="fk_marketplace_details_listing_id_listings", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("listing_id", name="pk_marketplace_details"),
    )


def downgrade() -> None:
    op.drop_table("marketplace_details")
    op.drop_table("buy_property_details")
    op.drop_table("rental_details")
    op.drop_index("ix_listing_media_listing_order", table_name="listing_media")
    op.drop_table("listing_media")
    op.drop_index("ix_listings_created_at", table_name="listings")
    op.drop_index("ix_listings_featured", table_name="listings")
    op.drop_index("ix_listings_owner_status", table_name="listings")
    op.drop_index("ix_listings_public_search", table_name="listings")
    op.drop_table("listings")