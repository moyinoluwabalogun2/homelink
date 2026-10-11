from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
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
    from app.models.listing import Listing


class MediaCleanupJob(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = (
        "media_cleanup_jobs"
    )

    __table_args__ = (
        UniqueConstraint(
            "storage_public_id",
            "resource_type",
            "delivery_type",
            name=(
                "uq_media_cleanup_jobs_asset"
            ),
        ),
        CheckConstraint(
            "attempts >= 0",
            name=(
                "attempts_nonnegative"
            ),
        ),
        Index(
            "ix_media_cleanup_jobs_pending",
            "attempts",
            "created_at",
        ),
        Index(
            "ix_media_cleanup_jobs_listing_id",
            "listing_id",
        ),
    )

    storage_public_id: Mapped[str] = (
        mapped_column(
            String(255),
            nullable=False,
        )
    )

    resource_type: Mapped[str] = (
        mapped_column(
            String(16),
            nullable=False,
            default="image",
            server_default=text(
                "'image'",
            ),
        )
    )

    delivery_type: Mapped[str] = (
        mapped_column(
            String(32),
            nullable=False,
            default="upload",
            server_default=text(
                "'upload'",
            ),
        )
    )

    reason: Mapped[str] = (
        mapped_column(
            String(64),
            nullable=False,
        )
    )

    listing_id: Mapped[
        UUID | None
    ] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "listings.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    attempts: Mapped[int] = (
        mapped_column(
            Integer,
            nullable=False,
            default=0,
            server_default=text("0"),
        )
    )

    last_error: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    listing: Mapped[
        Listing | None
    ] = relationship(
        lazy="noload",
    )