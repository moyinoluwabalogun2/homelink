from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import (
    UUID as PG_UUID,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.base import Base
from app.db.mixins import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)

if TYPE_CHECKING:
    pass


class State(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "states"

    __table_args__ = (
        UniqueConstraint(
            "country_code",
            "code",
            name=(
                "uq_states_"
                "country_code_code"
            ),
        ),
        UniqueConstraint(
            "country_code",
            "slug",
            name=(
                "uq_states_"
                "country_code_slug"
            ),
        ),
        CheckConstraint(
            "country_code = upper(country_code)",
            name="country_code_uppercase",
        ),
        CheckConstraint(
            "code = upper(code)",
            name="code_uppercase",
        ),
        CheckConstraint(
            (
                "slug ~ "
                "'^[a-z0-9]+(-[a-z0-9]+)*$'"
            ),
            name="slug_format",
        ),
        CheckConstraint(
            "sort_order >= 0",
            name="sort_order_nonnegative",
        ),
        Index(
            "ix_states_active_sort",
            "is_active",
            "sort_order",
        ),
    )

    country_code: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
        default="NG",
        server_default=text("'NG'"),
    )

    code: Mapped[str] = mapped_column(
        String(8),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(140),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    cities: Mapped[list[City]] = relationship(
        back_populates="state",
        lazy="selectin",
    )

    universities: Mapped[
        list[University]
    ] = relationship(
        back_populates="state",
        lazy="selectin",
    )


class City(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "cities"

    __table_args__ = (
        UniqueConstraint(
            "state_id",
            "slug",
            name="uq_cities_state_id_slug",
        ),
        CheckConstraint(
            (
                "slug ~ "
                "'^[a-z0-9]+(-[a-z0-9]+)*$'"
            ),
            name="slug_format",
        ),
        CheckConstraint(
            "sort_order >= 0",
            name="sort_order_nonnegative",
        ),
        Index(
            "ix_cities_state_active_sort",
            "state_id",
            "is_active",
            "sort_order",
        ),
    )

    state_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "states.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(140),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    state: Mapped[State] = relationship(
        back_populates="cities",
        lazy="joined",
    )

    campuses: Mapped[list[Campus]] = relationship(
        back_populates="city",
        lazy="selectin",
    )

    areas: Mapped[list[Area]] = relationship(
        back_populates="city",
        lazy="selectin",
    )


class University(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "universities"

    __table_args__ = (
        UniqueConstraint(
            "state_id",
            "slug",
            name=(
                "uq_universities_"
                "state_id_slug"
            ),
        ),
        CheckConstraint(
            (
                "slug ~ "
                "'^[a-z0-9]+(-[a-z0-9]+)*$'"
            ),
            name="slug_format",
        ),
        CheckConstraint(
            "sort_order >= 0",
            name="sort_order_nonnegative",
        ),
        Index(
            (
                "ix_universities_"
                "state_active_sort"
            ),
            "state_id",
            "is_active",
            "sort_order",
        ),
    )

    state_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "states.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    primary_city_id: Mapped[
        UUID | None
    ] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "cities.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(
        String(220),
        nullable=False,
    )

    short_name: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(240),
        nullable=False,
    )

    website_url: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    state: Mapped[State] = relationship(
        back_populates="universities",
        lazy="joined",
    )

    primary_city: Mapped[
        City | None
    ] = relationship(
        foreign_keys=[primary_city_id],
        lazy="joined",
    )

    campuses: Mapped[
        list[Campus]
    ] = relationship(
        back_populates="university",
        lazy="selectin",
    )


class Campus(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "campuses"

    __table_args__ = (
        UniqueConstraint(
            "university_id",
            "slug",
            name=(
                "uq_campuses_"
                "university_id_slug"
            ),
        ),
        UniqueConstraint(
            "university_id",
            "code",
            name=(
                "uq_campuses_"
                "university_id_code"
            ),
        ),
        CheckConstraint(
            "code = upper(code)",
            name="code_uppercase",
        ),
        CheckConstraint(
            (
                "slug ~ "
                "'^[a-z0-9]+(-[a-z0-9]+)*$'"
            ),
            name="slug_format",
        ),
        CheckConstraint(
            "sort_order >= 0",
            name="sort_order_nonnegative",
        ),
        CheckConstraint(
            (
                "latitude IS NULL OR "
                "(latitude BETWEEN -90 AND 90)"
            ),
            name="latitude_range",
        ),
        CheckConstraint(
            (
                "longitude IS NULL OR "
                "(longitude BETWEEN -180 AND 180)"
            ),
            name="longitude_range",
        ),
        Index(
            (
                "ix_campuses_"
                "university_active_sort"
            ),
            "university_id",
            "is_active",
            "sort_order",
        ),
        Index(
            "ix_campuses_city_id",
            "city_id",
        ),
    )

    university_id: Mapped[
        UUID
    ] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "universities.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    city_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "cities.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    address: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    latitude: Mapped[
        Decimal | None
    ] = mapped_column(
        Numeric(9, 6),
        nullable=True,
    )

    longitude: Mapped[
        Decimal | None
    ] = mapped_column(
        Numeric(9, 6),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    university: Mapped[
        University
    ] = relationship(
        back_populates="campuses",
        lazy="joined",
    )

    city: Mapped[City] = relationship(
        back_populates="campuses",
        lazy="joined",
    )

    areas: Mapped[list[Area]] = relationship(
        back_populates="campus",
        lazy="selectin",
    )


class Area(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "areas"

    __table_args__ = (
        UniqueConstraint(
            "city_id",
            "slug",
            name="uq_areas_city_id_slug",
        ),
        CheckConstraint(
            (
                "slug ~ "
                "'^[a-z0-9]+(-[a-z0-9]+)*$'"
            ),
            name="slug_format",
        ),
        CheckConstraint(
            "sort_order >= 0",
            name="sort_order_nonnegative",
        ),
        CheckConstraint(
            (
                "latitude IS NULL OR "
                "(latitude BETWEEN -90 AND 90)"
            ),
            name="latitude_range",
        ),
        CheckConstraint(
            (
                "longitude IS NULL OR "
                "(longitude BETWEEN -180 AND 180)"
            ),
            name="longitude_range",
        ),
        Index(
            "ix_areas_city_active_sort",
            "city_id",
            "is_active",
            "sort_order",
        ),
        Index(
            "ix_areas_campus_id",
            "campus_id",
        ),
    )

    city_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "cities.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    campus_id: Mapped[
        UUID | None
    ] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "campuses.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(
        String(140),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
    )

    description: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    latitude: Mapped[
        Decimal | None
    ] = mapped_column(
        Numeric(9, 6),
        nullable=True,
    )

    longitude: Mapped[
        Decimal | None
    ] = mapped_column(
        Numeric(9, 6),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    city: Mapped[City] = relationship(
        back_populates="areas",
        lazy="joined",
    )

    campus: Mapped[
        Campus | None
    ] = relationship(
        back_populates="areas",
        lazy="joined",
    )