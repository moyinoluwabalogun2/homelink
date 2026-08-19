"""Create agent verification tables.

Revision ID: 20260801_0003
Revises: 20260801_0002
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260801_0003"
down_revision: str | Sequence[str] | None = "20260801_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agent_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("agent_type", sa.String(length=20), nullable=False),
        sa.Column("business_name", sa.String(length=180), nullable=True),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("years_experience", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("years_experience >= 0", name="ck_agent_profiles_years_experience_nonnegative"),
        sa.ForeignKeyConstraint(["approved_by_id"], ["users.id"], name="fk_agent_profiles_approved_by_id_users", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_agent_profiles_user_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_agent_profiles"),
        sa.UniqueConstraint("user_id", name="uq_agent_profiles_user_id"),
    )
    op.create_index("ix_agent_profiles_status", "agent_profiles", ["status"])

    op.create_table(
        "agent_coverage_areas",
        sa.Column("agent_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["agent_profile_id"], ["agent_profiles.id"], name="fk_agent_coverage_areas_agent_profile_id_agent_profiles", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["area_id"], ["areas.id"], name="fk_agent_coverage_areas_area_id_areas", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("agent_profile_id", "area_id", name="pk_agent_coverage_areas"),
    )

    op.create_table(
        "agent_verification_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("agent_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_type", sa.String(length=40), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=False),
        sa.Column("storage_public_id", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["agent_profile_id"], ["agent_profiles.id"], name="fk_agent_verification_documents_agent_profile_id_agent_profiles", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_agent_verification_documents"),
    )
    op.create_index("ix_agent_documents_profile_status", "agent_verification_documents", ["agent_profile_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_agent_documents_profile_status", table_name="agent_verification_documents")
    op.drop_table("agent_verification_documents")
    op.drop_table("agent_coverage_areas")
    op.drop_index("ix_agent_profiles_status", table_name="agent_profiles")
    op.drop_table("agent_profiles")