from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
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
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.base import Base
from app.db.mixins import (
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)
from app.models.enums import (
    AgentApplicationStatus,
    AgentType,
    VerificationDocumentStatus,
    VerificationDocumentType,
    enum_values,
)


if TYPE_CHECKING:
    from app.models.location import Area
    from app.models.user import User


class AgentProfile(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    SoftDeleteMixin,
    Base,
):
    __tablename__ = "agent_profiles"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            name="uq_agent_profiles_user_id",
        ),
        CheckConstraint(
            "years_experience >= 0",
            name="years_experience_nonnegative",
        ),
        Index(
            "ix_agent_profiles_status",
            "status",
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

    agent_type: Mapped[AgentType] = mapped_column(
        Enum(
            AgentType,
            name="agent_type",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )

    business_name: Mapped[str | None] = mapped_column(
        String(180),
        nullable=True,
    )

    bio: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    years_experience: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    status: Mapped[
        AgentApplicationStatus
    ] = mapped_column(
        Enum(
            AgentApplicationStatus,
            name="agent_application_status",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=AgentApplicationStatus.PENDING,
        server_default=text("'pending'"),
    )

    rejection_reason: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    submitted_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    approved_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    approved_by_id: Mapped[
        UUID | None
    ] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    user: Mapped["User"] = relationship(
        back_populates="agent_profile",
        foreign_keys=[user_id],
        lazy="joined",
    )

    approved_by: Mapped[
        "User | None"
    ] = relationship(
        foreign_keys=[approved_by_id],
        lazy="joined",
    )

    coverage_areas: Mapped[
        list["AgentCoverageArea"]
    ] = relationship(
        back_populates="agent_profile",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )

    documents: Mapped[
        list["AgentVerificationDocument"]
    ] = relationship(
        back_populates="agent_profile",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )


class AgentCoverageArea(
    TimestampMixin,
    Base,
):
    __tablename__ = (
        "agent_coverage_areas"
    )

    agent_profile_id: Mapped[
        UUID
    ] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "agent_profiles.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    area_id: Mapped[
        UUID
    ] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "areas.id",
            ondelete="RESTRICT",
        ),
        primary_key=True,
    )

    agent_profile: Mapped[
        "AgentProfile"
    ] = relationship(
        back_populates=(
            "coverage_areas"
        )
    )

    area: Mapped[
        "Area"
    ] = relationship(
        lazy="joined",
    )


class AgentVerificationDocument(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = (
        "agent_verification_documents"
    )

    __table_args__ = (
        Index(
            "ix_agent_documents_profile_status",
            "agent_profile_id",
            "status",
        ),
        Index(
            "ix_agent_documents_retention",
            "purged_at",
            "reviewed_at",
        ),
    )

    agent_profile_id: Mapped[
        UUID
    ] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "agent_profiles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    document_type: Mapped[
        VerificationDocumentType
    ] = mapped_column(
        Enum(
            VerificationDocumentType,
            name=(
                "verification_document_type"
            ),
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
    )

    # Becomes NULL after the retained Cloudinary file
    # has been permanently purged.
    file_url: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    storage_public_id: Mapped[
        str | None
    ] = mapped_column(
        String(255),
        nullable=True,
    )

    file_format: Mapped[
        str | None
    ] = mapped_column(
        String(32),
        nullable=True,
    )

    storage_resource_type: Mapped[
        str
    ] = mapped_column(
        String(16),
        nullable=False,
        default="image",
        server_default="image",
    )

    storage_delivery_type: Mapped[
        str
    ] = mapped_column(
        String(32),
        nullable=False,
        default="upload",
        server_default="upload",
    )

    status: Mapped[
        VerificationDocumentStatus
    ] = mapped_column(
        Enum(
            VerificationDocumentStatus,
            name=(
                "verification_document_status"
            ),
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=(
            VerificationDocumentStatus.PENDING
        ),
        server_default=text(
            "'pending'"
        ),
    )

    rejection_reason: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    reviewed_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    purged_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    agent_profile: Mapped[
        "AgentProfile"
    ] = relationship(
        back_populates="documents",
    )