from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import (
    JSONB,
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
from app.models.enums import (
    AdvertisementPlacement,
    AdvertisementStatus,
    PaymentProvider,
    PaymentStatus,
    enum_values,
)


if TYPE_CHECKING:
    from app.models.location import Area
    from app.models.user import User


class Advertisement(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "advertisements"

    __table_args__ = (
        UniqueConstraint(
            "reference",
            name=(
                "uq_advertisements_"
                "reference"
            ),
        ),
        UniqueConstraint(
            "management_token_hash",
            name=(
                "uq_advertisements_"
                "management_token_hash"
            ),
        ),
        CheckConstraint(
            "amount_kobo >= 0",
            name=(
                "ck_advertisements_"
                "amount_nonnegative"
            ),
        ),
        CheckConstraint(
            "duration_days > 0",
            name=(
                "ck_advertisements_"
                "duration_positive"
            ),
        ),
        CheckConstraint(
            "impression_count >= 0",
            name=(
                "ck_advertisements_"
                "impressions_nonnegative"
            ),
        ),
        CheckConstraint(
            "click_count >= 0",
            name=(
                "ck_advertisements_"
                "clicks_nonnegative"
            ),
        ),
        CheckConstraint(
            (
                "ends_at IS NULL OR "
                "starts_at IS NOT NULL"
            ),
            name=(
                "ck_advertisements_"
                "end_requires_start"
            ),
        ),
        CheckConstraint(
            (
                "ends_at IS NULL OR "
                "ends_at > starts_at"
            ),
            name=(
                "ck_advertisements_"
                "end_after_start"
            ),
        ),
        Index(
            (
                "ix_advertisements_"
                "status_schedule"
            ),
            "status",
            "starts_at",
            "ends_at",
        ),
        Index(
            (
                "ix_advertisements_"
                "placement_status"
            ),
            "placement",
            "status",
        ),
        Index(
            (
                "ix_advertisements_"
                "area_status"
            ),
            "area_id",
            "status",
        ),
        Index(
            (
                "ix_advertisements_"
                "contact_created"
            ),
            "contact_email",
            "created_at",
        ),
    )

    reference: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
    )

    management_token_hash: Mapped[
        str
    ] = mapped_column(
        String(64),
        nullable=False,
    )

    business_name: Mapped[str] = (
        mapped_column(
            String(160),
            nullable=False,
        )
    )

    headline: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    description: Mapped[str] = (
        mapped_column(
            String(500),
            nullable=False,
        )
    )

    call_to_action: Mapped[str] = (
        mapped_column(
            String(40),
            nullable=False,
        )
    )

    destination_url: Mapped[str] = (
        mapped_column(
            String(1000),
            nullable=False,
        )
    )

    contact_email: Mapped[str] = (
        mapped_column(
            String(320),
            nullable=False,
        )
    )

    contact_phone: Mapped[
        str | None
    ] = mapped_column(
        String(40),
        nullable=True,
    )

    image_url: Mapped[str] = (
        mapped_column(
            String(1000),
            nullable=False,
        )
    )

    image_public_id: Mapped[str] = (
        mapped_column(
            String(255),
            nullable=False,
        )
    )

    placement: Mapped[
        AdvertisementPlacement
    ] = mapped_column(
        Enum(
            AdvertisementPlacement,
            name=(
                "advertisement_placement"
            ),
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )

    status: Mapped[
        AdvertisementStatus
    ] = mapped_column(
        Enum(
            AdvertisementStatus,
            name="advertisement_status",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=(
            AdvertisementStatus
            .PAYMENT_PENDING
        ),
        server_default=text(
            "'payment_pending'"
        ),
    )

    area_id: Mapped[
        UUID | None
    ] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "areas.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    amount_kobo: Mapped[int] = (
        mapped_column(
            Integer,
            nullable=False,
            default=500_000,
            server_default=text(
                "500000"
            ),
        )
    )

    currency: Mapped[str] = (
        mapped_column(
            String(3),
            nullable=False,
            default="NGN",
            server_default=text(
                "'NGN'"
            ),
        )
    )

    duration_days: Mapped[int] = (
        mapped_column(
            Integer,
            nullable=False,
            default=7,
            server_default=text("7"),
        )
    )

    preferred_start_date: Mapped[
        date | None
    ] = mapped_column(
        Date,
        nullable=True,
    )

    starts_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    ends_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    approved_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    rejected_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    reviewed_by_user_id: Mapped[
        UUID | None
    ] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    review_notes: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    rejection_reason: Mapped[
        str | None
    ] = mapped_column(
        String(1000),
        nullable=True,
    )

    impression_count: Mapped[int] = (
        mapped_column(
            BigInteger,
            nullable=False,
            default=0,
            server_default=text("0"),
        )
    )

    click_count: Mapped[int] = (
        mapped_column(
            BigInteger,
            nullable=False,
            default=0,
            server_default=text("0"),
        )
    )

    area: Mapped[
        Area | None
    ] = relationship(
        lazy="selectin",
    )

    reviewer: Mapped[
        User | None
    ] = relationship(
        lazy="raise",
        foreign_keys=[
            reviewed_by_user_id,
        ],
    )

    payments: Mapped[
        list[AdvertisementPayment]
    ] = relationship(
        back_populates="advertisement",
        cascade="all, delete-orphan",
        lazy="raise",
    )


class AdvertisementPayment(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = (
        "advertisement_payments"
    )

    __table_args__ = (
        UniqueConstraint(
            "reference",
            name=(
                "uq_advertisement_"
                "payments_reference"
            ),
        ),
        CheckConstraint(
            "amount_kobo >= 0",
            name=(
                "ck_advertisement_"
                "payments_amount_"
                "nonnegative"
            ),
        ),
        Index(
            (
                "ix_advertisement_"
                "payments_ad_created"
            ),
            "advertisement_id",
            "created_at",
        ),
        Index(
            (
                "ix_advertisement_"
                "payments_status_created"
            ),
            "status",
            "created_at",
        ),
    )

    advertisement_id: Mapped[
        UUID
    ] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "advertisements.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    reference: Mapped[str] = (
        mapped_column(
            String(120),
            nullable=False,
        )
    )

    provider: Mapped[
        PaymentProvider
    ] = mapped_column(
        Enum(
            PaymentProvider,
            name=(
                "advertisement_"
                "payment_provider"
            ),
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )

    status: Mapped[
        PaymentStatus
    ] = mapped_column(
        Enum(
            PaymentStatus,
            name=(
                "advertisement_"
                "payment_status"
            ),
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=PaymentStatus.PENDING,
        server_default=text(
            "'pending'"
        ),
    )

    amount_kobo: Mapped[int] = (
        mapped_column(
            Integer,
            nullable=False,
        )
    )

    currency: Mapped[str] = (
        mapped_column(
            String(3),
            nullable=False,
        )
    )

    authorization_url: Mapped[
        str | None
    ] = mapped_column(
        String(1000),
        nullable=True,
    )

    access_code: Mapped[
        str | None
    ] = mapped_column(
        String(255),
        nullable=True,
    )

    provider_transaction_id: Mapped[
        str | None
    ] = mapped_column(
        String(120),
        nullable=True,
    )

    provider_metadata: Mapped[
        dict[str, Any]
    ] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text(
            "'{}'::jsonb"
        ),
    )

    paid_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    advertisement: Mapped[
        Advertisement
    ] = relationship(
        back_populates="payments",
        lazy="raise",
    )