from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
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
    CreditType,
    PaymentProvider,
    PaymentStatus,
    enum_values,
)


if TYPE_CHECKING:
    from app.models.user import User


class ListingCreditBalance(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "listing_credit_balances"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "credit_type",
            name="uq_credit_balances_user_type",
        ),
        CheckConstraint(
            "free_remaining >= 0",
            name="free_remaining_nonnegative",
        ),
        CheckConstraint(
            "paid_remaining >= 0",
            name="paid_remaining_nonnegative",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    credit_type: Mapped[CreditType] = mapped_column(
        Enum(
            CreditType,
            name="credit_type",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )

    free_remaining: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    paid_remaining: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    user: Mapped[User] = relationship(
        lazy="selectin",
    )


class PaymentPlan(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "payment_plans"

    __table_args__ = (
        UniqueConstraint(
            "code",
            name="uq_payment_plans_code",
        ),
        CheckConstraint(
            "amount_kobo >= 0",
            name="amount_kobo_nonnegative",
        ),
        CheckConstraint(
            "credit_quantity > 0",
            name="credit_quantity_positive",
        ),
        Index(
            "ix_payment_plans_active_sort",
            "is_active",
            "sort_order",
        ),
    )

    code: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    credit_type: Mapped[CreditType] = mapped_column(
        Enum(
            CreditType,
            name="payment_plan_credit_type",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )

    credit_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    amount_kobo: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="NGN",
        server_default=text("'NGN'"),
    )

    is_active: Mapped[bool] = mapped_column(
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


class Payment(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "payments"

    __table_args__ = (
        UniqueConstraint(
            "reference",
            name="uq_payments_reference",
        ),
        Index(
            "ix_payments_user_created",
            "user_id",
            "created_at",
        ),
        Index(
            "ix_payments_status_created",
            "status",
            "created_at",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    plan_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "payment_plans.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    reference: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    provider: Mapped[PaymentProvider] = mapped_column(
        Enum(
            PaymentProvider,
            name="payment_provider",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )

    status: Mapped[PaymentStatus] = mapped_column(
        Enum(
            PaymentStatus,
            name="payment_status",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=PaymentStatus.PENDING,
        server_default=text("'pending'"),
    )

    amount_kobo: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
    )

    authorization_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    access_code: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    provider_transaction_id: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    provider_metadata: Mapped[
        dict[str, Any]
    ] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped[User] = relationship(
        lazy="selectin",
    )

    plan: Mapped[PaymentPlan] = relationship(
        lazy="selectin",
    )


class PaymentWebhookEvent(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "payment_webhook_events"

    __table_args__ = (
        UniqueConstraint(
            "event_key",
            name="uq_payment_webhook_events_event_key",
        ),
        Index(
            "ix_payment_webhook_events_provider_created",
            "provider",
            "created_at",
        ),
    )

    provider: Mapped[PaymentProvider] = mapped_column(
        Enum(
            PaymentProvider,
            name="webhook_payment_provider",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )

    event_key: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    event_type: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    payload: Mapped[
        dict[str, Any]
    ] = mapped_column(
        JSONB,
        nullable=False,
    )

    processed_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )