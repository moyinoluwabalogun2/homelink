from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    InquiryStatus,
    InquiryType,
    ReportReason,
    ReportStatus,
    enum_values,
)

if TYPE_CHECKING:
    from app.models.listing import Listing
    from app.models.user import User


class SavedListing(TimestampMixin, Base):
    __tablename__ = "saved_listings"

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    listing_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        primary_key=True,
    )

    user: Mapped[User] = relationship(lazy="joined")
    listing: Mapped[Listing] = relationship(lazy="joined")


class Inquiry(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "inquiries"

    __table_args__ = (
        Index(
            "ix_inquiries_sender_created",
            "sender_id",
            "created_at",
        ),
        Index(
            "ix_inquiries_recipient_status",
            "recipient_id",
            "status",
        ),
        Index(
            "ix_inquiries_listing_id",
            "listing_id",
        ),
        Index(
            "ix_inquiries_sender_last_message",
            "sender_id",
            "last_message_at",
        ),
        Index(
            "ix_inquiries_recipient_last_message",
            "recipient_id",
            "last_message_at",
        ),
    )

    listing_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
    )

    sender_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    recipient_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    inquiry_type: Mapped[InquiryType] = mapped_column(
        Enum(
            InquiryType,
            name="inquiry_type",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )

    # Kept for backwards compatibility.
    # This remains the original inquiry message.
    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[InquiryStatus] = mapped_column(
        Enum(
            InquiryStatus,
            name="inquiry_status",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=InquiryStatus.OPEN,
        server_default=text("'open'"),
    )

    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ---------------------------------------------------------
    # Conversation metadata
    # ---------------------------------------------------------

    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    last_message_preview: Mapped[str] = mapped_column(
        String(240),
        nullable=False,
    )

    last_message_sender_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Instead of updating every message when a thread is read,
    # each participant gets one read cursor.
    sender_last_read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    recipient_last_read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    listing: Mapped[Listing] = relationship(
        lazy="joined",
    )

    sender: Mapped[User] = relationship(
        foreign_keys=[sender_id],
        lazy="joined",
    )

    recipient: Mapped[User] = relationship(
        foreign_keys=[recipient_id],
        lazy="joined",
    )

    last_message_sender: Mapped[User] = relationship(
        foreign_keys=[last_message_sender_id],
        lazy="joined",
    )

    messages: Mapped[list[InquiryMessage]] = relationship(
        back_populates="inquiry",
        cascade="all, delete-orphan",
        order_by="InquiryMessage.created_at",
        lazy="raise",
    )


class InquiryMessage(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "inquiry_messages"

    __table_args__ = (
        Index(
            "ix_inquiry_messages_inquiry_created",
            "inquiry_id",
            "created_at",
        ),
    )

    inquiry_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "inquiries.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    sender_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    inquiry: Mapped[Inquiry] = relationship(
        back_populates="messages",
        lazy="raise",
    )

    sender: Mapped[User] = relationship(
        foreign_keys=[sender_id],
        lazy="joined",
    )


class ListingReport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "listing_reports"

    __table_args__ = (
        UniqueConstraint(
            "listing_id",
            "reporter_id",
            name="uq_listing_reports_listing_reporter",
        ),
        Index(
            "ix_listing_reports_status_created",
            "status",
            "created_at",
        ),
        Index(
            "ix_listing_reports_listing_id",
            "listing_id",
        ),
    )

    listing_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
    )

    reporter_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    reason: Mapped[ReportReason] = mapped_column(
        Enum(
            ReportReason,
            name="report_reason",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )

    details: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[ReportStatus] = mapped_column(
        Enum(
            ReportStatus,
            name="report_status",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=ReportStatus.OPEN,
        server_default=text("'open'"),
    )

    resolution_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reviewed_by_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    listing: Mapped[Listing] = relationship(
        lazy="joined",
    )

    reporter: Mapped[User] = relationship(
        foreign_keys=[reporter_id],
        lazy="joined",
    )

    reviewed_by: Mapped[User | None] = relationship(
        foreign_keys=[reviewed_by_id],
        lazy="joined",
    )