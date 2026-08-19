"""Create foundational HomeLink tables.

Revision ID: 20260730_0001
Revises:
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260730_0001"

down_revision: (
    str
    | Sequence[str]
    | None
) = None

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


user_role = sa.Enum(
    "user",
    "agent",
    "admin",
    name="user_role",
    native_enum=False,
    create_constraint=True,
)


account_status = sa.Enum(
    "pending_verification",
    "active",
    "suspended",
    "deactivated",
    name="account_status",
    native_enum=False,
    create_constraint=True,
)


def timestamp_columns() -> list[sa.Column]:
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
    op.create_table(
        "states",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "country_code",
            sa.String(length=2),
            nullable=False,
            server_default=sa.text("'NG'"),
        ),
        sa.Column(
            "code",
            sa.String(length=8),
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(length=120),
            nullable=False,
        ),
        sa.Column(
            "slug",
            sa.String(length=140),
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        *timestamp_columns(),
        sa.CheckConstraint(
            (
                "country_code = "
                "upper(country_code)"
            ),
            name=(
                "ck_states_"
                "country_code_uppercase"
            ),
        ),
        sa.CheckConstraint(
            "code = upper(code)",
            name="ck_states_code_uppercase",
        ),
        sa.CheckConstraint(
            (
                "slug ~ "
                "'^[a-z0-9]+"
                "(-[a-z0-9]+)*$'"
            ),
            name="ck_states_slug_format",
        ),
        sa.CheckConstraint(
            "sort_order >= 0",
            name=(
                "ck_states_"
                "sort_order_nonnegative"
            ),
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name="pk_states",
        ),
        sa.UniqueConstraint(
            "country_code",
            "code",
            name=(
                "uq_states_"
                "country_code_code"
            ),
        ),
        sa.UniqueConstraint(
            "country_code",
            "slug",
            name=(
                "uq_states_"
                "country_code_slug"
            ),
        ),
    )

    op.create_index(
        "ix_states_active_sort",
        "states",
        [
            "is_active",
            "sort_order",
        ],
        unique=False,
    )

    op.create_table(
        "cities",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "state_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(length=120),
            nullable=False,
        ),
        sa.Column(
            "slug",
            sa.String(length=140),
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        *timestamp_columns(),
        sa.CheckConstraint(
            (
                "slug ~ "
                "'^[a-z0-9]+"
                "(-[a-z0-9]+)*$'"
            ),
            name="ck_cities_slug_format",
        ),
        sa.CheckConstraint(
            "sort_order >= 0",
            name=(
                "ck_cities_"
                "sort_order_nonnegative"
            ),
        ),
        sa.ForeignKeyConstraint(
            ["state_id"],
            ["states.id"],
            name=(
                "fk_cities_"
                "state_id_states"
            ),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name="pk_cities",
        ),
        sa.UniqueConstraint(
            "state_id",
            "slug",
            name="uq_cities_state_id_slug",
        ),
    )

    op.create_index(
        "ix_cities_state_active_sort",
        "cities",
        [
            "state_id",
            "is_active",
            "sort_order",
        ],
        unique=False,
    )

    op.create_table(
        "universities",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "state_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "primary_city_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "name",
            sa.String(length=220),
            nullable=False,
        ),
        sa.Column(
            "short_name",
            sa.String(length=40),
            nullable=False,
        ),
        sa.Column(
            "slug",
            sa.String(length=240),
            nullable=False,
        ),
        sa.Column(
            "website_url",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        *timestamp_columns(),
        sa.CheckConstraint(
            (
                "slug ~ "
                "'^[a-z0-9]+"
                "(-[a-z0-9]+)*$'"
            ),
            name=(
                "ck_universities_"
                "slug_format"
            ),
        ),
        sa.CheckConstraint(
            "sort_order >= 0",
            name=(
                "ck_universities_"
                "sort_order_nonnegative"
            ),
        ),
        sa.ForeignKeyConstraint(
            ["primary_city_id"],
            ["cities.id"],
            name=(
                "fk_universities_"
                "primary_city_id_cities"
            ),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["state_id"],
            ["states.id"],
            name=(
                "fk_universities_"
                "state_id_states"
            ),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name="pk_universities",
        ),
        sa.UniqueConstraint(
            "state_id",
            "slug",
            name=(
                "uq_universities_"
                "state_id_slug"
            ),
        ),
    )

    op.create_index(
        (
            "ix_universities_"
            "state_active_sort"
        ),
        "universities",
        [
            "state_id",
            "is_active",
            "sort_order",
        ],
        unique=False,
    )

    op.create_table(
        "campuses",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "university_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "city_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(length=180),
            nullable=False,
        ),
        sa.Column(
            "code",
            sa.String(length=32),
            nullable=False,
        ),
        sa.Column(
            "slug",
            sa.String(length=200),
            nullable=False,
        ),
        sa.Column(
            "address",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "latitude",
            sa.Numeric(9, 6),
            nullable=True,
        ),
        sa.Column(
            "longitude",
            sa.Numeric(9, 6),
            nullable=True,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        *timestamp_columns(),
        sa.CheckConstraint(
            "code = upper(code)",
            name=(
                "ck_campuses_"
                "code_uppercase"
            ),
        ),
        sa.CheckConstraint(
            (
                "slug ~ "
                "'^[a-z0-9]+"
                "(-[a-z0-9]+)*$'"
            ),
            name=(
                "ck_campuses_slug_format"
            ),
        ),
        sa.CheckConstraint(
            "sort_order >= 0",
            name=(
                "ck_campuses_"
                "sort_order_nonnegative"
            ),
        ),
        sa.CheckConstraint(
            (
                "latitude IS NULL OR "
                "(latitude BETWEEN -90 AND 90)"
            ),
            name=(
                "ck_campuses_"
                "latitude_range"
            ),
        ),
        sa.CheckConstraint(
            (
                "longitude IS NULL OR "
                "(longitude BETWEEN "
                "-180 AND 180)"
            ),
            name=(
                "ck_campuses_"
                "longitude_range"
            ),
        ),
        sa.ForeignKeyConstraint(
            ["city_id"],
            ["cities.id"],
            name=(
                "fk_campuses_"
                "city_id_cities"
            ),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["university_id"],
            ["universities.id"],
            name=(
                "fk_campuses_"
                "university_id_universities"
            ),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name="pk_campuses",
        ),
        sa.UniqueConstraint(
            "university_id",
            "code",
            name=(
                "uq_campuses_"
                "university_id_code"
            ),
        ),
        sa.UniqueConstraint(
            "university_id",
            "slug",
            name=(
                "uq_campuses_"
                "university_id_slug"
            ),
        ),
    )

    op.create_index(
        "ix_campuses_city_id",
        "campuses",
        ["city_id"],
        unique=False,
    )

    op.create_index(
        (
            "ix_campuses_"
            "university_active_sort"
        ),
        "campuses",
        [
            "university_id",
            "is_active",
            "sort_order",
        ],
        unique=False,
    )

    op.create_table(
        "areas",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "city_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "campus_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "name",
            sa.String(length=140),
            nullable=False,
        ),
        sa.Column(
            "slug",
            sa.String(length=160),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "latitude",
            sa.Numeric(9, 6),
            nullable=True,
        ),
        sa.Column(
            "longitude",
            sa.Numeric(9, 6),
            nullable=True,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        *timestamp_columns(),
        sa.CheckConstraint(
            (
                "slug ~ "
                "'^[a-z0-9]+"
                "(-[a-z0-9]+)*$'"
            ),
            name="ck_areas_slug_format",
        ),
        sa.CheckConstraint(
            "sort_order >= 0",
            name=(
                "ck_areas_"
                "sort_order_nonnegative"
            ),
        ),
        sa.CheckConstraint(
            (
                "latitude IS NULL OR "
                "(latitude BETWEEN -90 AND 90)"
            ),
            name=(
                "ck_areas_latitude_range"
            ),
        ),
        sa.CheckConstraint(
            (
                "longitude IS NULL OR "
                "(longitude BETWEEN "
                "-180 AND 180)"
            ),
            name=(
                "ck_areas_longitude_range"
            ),
        ),
        sa.ForeignKeyConstraint(
            ["campus_id"],
            ["campuses.id"],
            name=(
                "fk_areas_"
                "campus_id_campuses"
            ),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["city_id"],
            ["cities.id"],
            name=(
                "fk_areas_city_id_cities"
            ),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name="pk_areas",
        ),
        sa.UniqueConstraint(
            "city_id",
            "slug",
            name="uq_areas_city_id_slug",
        ),
    )

    op.create_index(
        "ix_areas_campus_id",
        "areas",
        ["campus_id"],
        unique=False,
    )

    op.create_index(
        "ix_areas_city_active_sort",
        "areas",
        [
            "city_id",
            "is_active",
            "sort_order",
        ],
        unique=False,
    )

    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "full_name",
            sa.String(length=160),
            nullable=False,
        ),
        sa.Column(
            "email",
            sa.String(length=320),
            nullable=False,
        ),
        sa.Column(
            "phone",
            sa.String(length=32),
            nullable=False,
        ),
        sa.Column(
            "password_hash",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "role",
            user_role,
            nullable=False,
            server_default=sa.text("'user'"),
        ),
        sa.Column(
            "status",
            account_status,
            nullable=False,
            server_default=sa.text(
                "'pending_verification'"
            ),
        ),
        sa.Column(
            "is_email_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_phone_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "profile_image_url",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "last_login_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        *timestamp_columns(),
        sa.CheckConstraint(
            "char_length(full_name) >= 2",
            name=(
                "ck_users_"
                "full_name_min_length"
            ),
        ),
        sa.CheckConstraint(
            "email = lower(email)",
            name=(
                "ck_users_email_lowercase"
            ),
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name="pk_users",
        ),
        sa.UniqueConstraint(
            "email",
            name="uq_users_email",
        ),
        sa.UniqueConstraint(
            "phone",
            name="uq_users_phone",
        ),
    )

    op.create_index(
        "ix_users_created_at",
        "users",
        ["created_at"],
        unique=False,
    )

    op.create_index(
        "ix_users_role_status",
        "users",
        ["role", "status"],
        unique=False,
    )

    op.create_table(
        "auth_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "refresh_token_hash",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "user_agent",
            sa.String(length=500),
            nullable=True,
        ),
        sa.Column(
            "ip_address",
            sa.String(length=45),
            nullable=True,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "revoked_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "last_used_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        *timestamp_columns(),
        sa.CheckConstraint(
            "expires_at > created_at",
            name=(
                "ck_auth_sessions_"
                "expiry_after_creation"
            ),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=(
                "fk_auth_sessions_"
                "user_id_users"
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name="pk_auth_sessions",
        ),
        sa.UniqueConstraint(
            "refresh_token_hash",
            name=(
                "uq_auth_sessions_"
                "refresh_token_hash"
            ),
        ),
    )

    op.create_index(
        (
            "ix_auth_sessions_"
            "revoked_at"
        ),
        "auth_sessions",
        ["revoked_at"],
        unique=False,
    )

    op.create_index(
        (
            "ix_auth_sessions_"
            "user_expires"
        ),
        "auth_sessions",
        ["user_id", "expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        (
            "ix_auth_sessions_"
            "user_expires"
        ),
        table_name="auth_sessions",
    )

    op.drop_index(
        (
            "ix_auth_sessions_"
            "revoked_at"
        ),
        table_name="auth_sessions",
    )

    op.drop_table("auth_sessions")

    op.drop_index(
        "ix_users_role_status",
        table_name="users",
    )

    op.drop_index(
        "ix_users_created_at",
        table_name="users",
    )

    op.drop_table("users")

    op.drop_index(
        "ix_areas_city_active_sort",
        table_name="areas",
    )

    op.drop_index(
        "ix_areas_campus_id",
        table_name="areas",
    )

    op.drop_table("areas")

    op.drop_index(
        (
            "ix_campuses_"
            "university_active_sort"
        ),
        table_name="campuses",
    )

    op.drop_index(
        "ix_campuses_city_id",
        table_name="campuses",
    )

    op.drop_table("campuses")

    op.drop_index(
        (
            "ix_universities_"
            "state_active_sort"
        ),
        table_name="universities",
    )

    op.drop_table("universities")

    op.drop_index(
        "ix_cities_state_active_sort",
        table_name="cities",
    )

    op.drop_table("cities")

    op.drop_index(
        "ix_states_active_sort",
        table_name="states",
    )

    op.drop_table("states")