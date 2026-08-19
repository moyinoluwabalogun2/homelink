"""Add secure authentication fields and password reset tokens.

Revision ID: 20260801_0002
Revises: 20260730_0001
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260801_0002"
down_revision: str | Sequence[str] | None = "20260730_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("auth_version", sa.Integer(), nullable=False, server_default=sa.text("1")))
    op.add_column("users", sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.add_column("users", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("requires_password_reset", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("users", sa.Column("last_failed_login_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    op.add_column("users", sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("privacy_notice_acknowledged_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("terms_version", sa.String(length=40), nullable=True))
    op.add_column("users", sa.Column("privacy_version", sa.String(length=40), nullable=True))
    op.add_column("users", sa.Column("marketing_consent", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    op.create_check_constraint("ck_users_auth_version_positive", "users", "auth_version >= 1")
    op.create_check_constraint("ck_users_failed_login_attempts_nonnegative", "users", "failed_login_attempts >= 0")
    op.create_index("ix_users_locked_until", "users", ["locked_until"], unique=False)

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("requested_ip", sa.String(length=45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("expires_at > created_at", name="ck_password_reset_tokens_expiry_after_creation"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_password_reset_tokens_user_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_password_reset_tokens"),
        sa.UniqueConstraint("token_hash", name="uq_password_reset_tokens_token_hash"),
    )
    op.create_index("ix_password_reset_tokens_user_expires", "password_reset_tokens", ["user_id", "expires_at"])
    op.create_index("ix_password_reset_tokens_used_at", "password_reset_tokens", ["used_at"])


def downgrade() -> None:
    op.drop_index("ix_password_reset_tokens_used_at", table_name="password_reset_tokens")
    op.drop_index("ix_password_reset_tokens_user_expires", table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
    op.drop_index("ix_users_locked_until", table_name="users")
    op.drop_constraint("ck_users_failed_login_attempts_nonnegative", "users", type_="check")
    op.drop_constraint("ck_users_auth_version_positive", "users", type_="check")
    for column in [
        "marketing_consent",
        "privacy_version",
        "terms_version",
        "privacy_notice_acknowledged_at",
        "terms_accepted_at",
        "password_changed_at",
        "last_failed_login_at",
        "requires_password_reset",
        "locked_until",
        "failed_login_attempts",
        "auth_version",
    ]:
        op.drop_column("users", column)