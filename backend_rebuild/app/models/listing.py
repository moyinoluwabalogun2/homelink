from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    CreditSource,
    ItemCondition,
    ListingStatus,
    ListingType,
    MarketplaceCategory,
    MediaType,
    PropertyCategory,
    PropertyCondition,
    RentalCategory,
    RentPeriod,
    enum_values,
)

if TYPE_CHECKING:
    from app.models.location import Area, Campus
    from app.models.user import User


class Listing(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "listings"

    __table_args__ = (
        UniqueConstraint("slug", name="uq_listings_slug"),
        CheckConstraint("price >= 0", name="price_nonnegative"),
        CheckConstraint("view_count >= 0", name="view_count_nonnegative"),
        CheckConstraint("contact_count >= 0", name="contact_count_nonnegative"),
        Index("ix_listings_public_search", "listing_type", "status", "area_id"),
        Index("ix_listings_owner_status", "owner_id", "status"),
        Index("ix_listings_featured", "is_featured", "featured_until"),
        Index("ix_listings_created_at", "created_at"),
    )

    owner_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    area_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("areas.id", ondelete="RESTRICT"),
        nullable=False,
    )
    campus_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("campuses.id", ondelete="SET NULL"),
        nullable=True,
    )
    listing_type: Mapped[ListingType] = mapped_column(
        Enum(
            ListingType,
            name="listing_type",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    slug: Mapped[str] = mapped_column(String(260), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="NGN", server_default=text("'NGN'")
    )
    status: Mapped[ListingStatus] = mapped_column(
        Enum(
            ListingStatus,
            name="listing_status",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=ListingStatus.DRAFT,
        server_default=text("'draft'"),
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    featured_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_by_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    view_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    contact_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    posting_credit_charged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    posting_credit_source: Mapped[CreditSource | None] = mapped_column(
        Enum(
            CreditSource,
            name="listing_credit_source",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=True,
    )

    owner: Mapped[User] = relationship(
        back_populates="listings",
        foreign_keys=[owner_id],
        lazy="joined",
    )
    approved_by: Mapped[User | None] = relationship(
        foreign_keys=[approved_by_id], lazy="joined"
    )
    area: Mapped[Area] = relationship(lazy="joined")
    campus: Mapped[Campus | None] = relationship(lazy="joined")
    media: Mapped[list[ListingMedia]] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
        order_by="ListingMedia.sort_order",
    )
    rental_details: Mapped[RentalDetails | None] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
        lazy="selectin",
    )
    buy_property_details: Mapped[BuyPropertyDetails | None] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
        lazy="selectin",
    )
    marketplace_details: Mapped[MarketplaceDetails | None] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
        lazy="selectin",
    )


class ListingMedia(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "listing_media"

    __table_args__ = (
        CheckConstraint("sort_order >= 0", name="sort_order_nonnegative"),
        Index("ix_listing_media_listing_order", "listing_id", "sort_order"),
    )

    listing_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
    )
    media_type: Mapped[MediaType] = mapped_column(
        Enum(
            MediaType,
            name="media_type",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    storage_public_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_cover: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )

    listing: Mapped[Listing] = relationship(back_populates="media")


class RentalDetails(Base):
    __tablename__ = "rental_details"

    listing_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        primary_key=True,
    )
    category: Mapped[RentalCategory] = mapped_column(
        Enum(
            RentalCategory,
            name="rental_category",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )
    rent_period: Mapped[RentPeriod] = mapped_column(
        Enum(
            RentPeriod,
            name="rent_period",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )
    bedrooms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bathrooms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    toilets: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_furnished: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    caution_fee: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    service_charge: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    distance_to_campus_km: Mapped[Decimal | None] = mapped_column(
        Numeric(8, 2), nullable=True
    )
    address: Mapped[str] = mapped_column(Text, nullable=False)

    listing: Mapped[Listing] = relationship(back_populates="rental_details")


class BuyPropertyDetails(Base):
    __tablename__ = "buy_property_details"

    listing_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        primary_key=True,
    )
    category: Mapped[PropertyCategory] = mapped_column(
        Enum(
            PropertyCategory,
            name="property_category",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )
    property_condition: Mapped[PropertyCondition] = mapped_column(
        Enum(
            PropertyCondition,
            name="property_condition",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )
    bedrooms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bathrooms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    toilets: Mapped[int | None] = mapped_column(Integer, nullable=True)
    land_size_sqm: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    title_document: Mapped[str | None] = mapped_column(String(180), nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)

    listing: Mapped[Listing] = relationship(back_populates="buy_property_details")


class MarketplaceDetails(Base):
    __tablename__ = "marketplace_details"

    listing_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        primary_key=True,
    )
    category: Mapped[MarketplaceCategory] = mapped_column(
        Enum(
            MarketplaceCategory,
            name="marketplace_category",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )
    condition: Mapped[ItemCondition] = mapped_column(
        Enum(
            ItemCondition,
            name="item_condition",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )
    is_negotiable: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )

    listing: Mapped[Listing] = relationship(back_populates="marketplace_details")