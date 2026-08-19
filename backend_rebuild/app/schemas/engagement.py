from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.enums import (
    InquiryStatus,
    InquiryType,
    ListingType,
    ReportReason,
    ReportStatus,
    UserRole,
)
from app.schemas.common import ORMModel
from app.schemas.listing import ListingRead
from app.schemas.user import PublicUserRead


class SavedListingRead(ORMModel):
    listing: ListingRead
    created_at: datetime


# ============================================================
# INQUIRIES / MESSAGES
# ============================================================


class InquiryCreate(BaseModel):
    inquiry_type: InquiryType = InquiryType.GENERAL
    message: str = Field(min_length=1, max_length=3000)

    @field_validator("message")
    @classmethod
    def clean_message(cls, value: str) -> str:
        cleaned = value.strip()

        if len(cleaned) < 10:
            raise ValueError(
                "Inquiry message must be at least 10 characters."
            )

        return cleaned


class InquiryStatusUpdate(BaseModel):
    status: InquiryStatus


class InquiryMessageCreate(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=3000,
    )

    @field_validator("message")
    @classmethod
    def clean_message(cls, value: str) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError(
                "Message cannot be empty."
            )

        return cleaned


class InquiryParticipantRead(BaseModel):
    id: UUID
    full_name: str
    role: UserRole
    profile_image_url: str | None


class InquiryListingSummaryRead(BaseModel):
    id: UUID
    listing_type: ListingType
    title: str
    slug: str


class InquiryInboxItemRead(BaseModel):
    id: UUID

    listing: InquiryListingSummaryRead
    other_user: InquiryParticipantRead

    inquiry_type: InquiryType
    status: InquiryStatus

    last_message_preview: str
    last_message_at: datetime
    last_message_sender_id: UUID

    unread: bool

    created_at: datetime


class InquiryMessageRead(BaseModel):
    id: UUID
    inquiry_id: UUID
    sender_id: UUID

    message: str

    created_at: datetime
    updated_at: datetime


class InquiryThreadRead(BaseModel):
    id: UUID

    listing: InquiryListingSummaryRead

    sender: InquiryParticipantRead
    recipient: InquiryParticipantRead

    inquiry_type: InquiryType
    status: InquiryStatus

    responded_at: datetime | None
    closed_at: datetime | None

    created_at: datetime

    messages: list[InquiryMessageRead]

    has_more: bool
    next_before: datetime | None


# ============================================================
# LEGACY / BACKWARDS-COMPATIBLE INQUIRY RESPONSE
# ============================================================


class InquiryRead(ORMModel):
    id: UUID
    listing: ListingRead
    sender: PublicUserRead
    recipient: PublicUserRead
    inquiry_type: InquiryType
    message: str
    status: InquiryStatus
    responded_at: datetime | None
    closed_at: datetime | None
    created_at: datetime
    updated_at: datetime


# ============================================================
# REPORTS
# ============================================================


class ListingReportCreate(BaseModel):
    reason: ReportReason
    details: str | None = Field(
        default=None,
        max_length=3000,
    )


class ListingReportResolve(BaseModel):
    status: ReportStatus
    resolution_note: str = Field(
        min_length=5,
        max_length=3000,
    )


class ListingReportRead(ORMModel):
    id: UUID
    listing: ListingRead
    reporter: PublicUserRead
    reason: ReportReason
    details: str | None
    status: ReportStatus
    resolution_note: str | None
    reviewed_by: PublicUserRead | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime