from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    HttpUrl,
    field_validator,
)

from app.models.enums import (
    AdvertisementPlacement,
    AdvertisementStatus,
)
from app.schemas.common import ORMModel


class AdvertisementCreateRequest(
    BaseModel,
):
    business_name: str = Field(
        min_length=2,
        max_length=160,
    )

    headline: str = Field(
        min_length=3,
        max_length=120,
    )

    description: str = Field(
        min_length=10,
        max_length=500,
    )

    call_to_action: str = Field(
        min_length=2,
        max_length=40,
    )

    destination_url: HttpUrl

    contact_email: EmailStr

    contact_phone: str | None = Field(
        default=None,
        max_length=40,
    )

    placement: AdvertisementPlacement

    area_id: UUID | None = None

    preferred_start_date: date | None = None

    image_public_id: str = Field(
        min_length=10,
        max_length=255,
    )

    image_claim_token: str = Field(
        min_length=20,
        max_length=4000,
    )

    @field_validator(
        "business_name",
        "headline",
        "description",
        "call_to_action",
    )
    @classmethod
    def clean_required_text(
        cls,
        value: str,
    ) -> str:
        cleaned = " ".join(
            value.split()
        )

        if not cleaned:
            raise ValueError(
                "This field cannot be empty."
            )

        return cleaned

    @field_validator(
        "contact_phone",
    )
    @classmethod
    def clean_phone(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()

        return cleaned or None

    @field_validator(
        "image_public_id",
        "image_claim_token",
    )
    @classmethod
    def clean_upload_value(
        cls,
        value: str,
    ) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError(
                "Advertisement image upload "
                "information is required."
            )

        return cleaned


class AdvertisementUpdateRequest(
    BaseModel,
):
    business_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=160,
    )

    headline: str | None = Field(
        default=None,
        min_length=3,
        max_length=120,
    )

    description: str | None = Field(
        default=None,
        min_length=10,
        max_length=500,
    )

    call_to_action: str | None = Field(
        default=None,
        min_length=2,
        max_length=40,
    )

    destination_url: HttpUrl | None = None

    contact_email: EmailStr | None = None

    contact_phone: str | None = Field(
        default=None,
        max_length=40,
    )

    placement: (
        AdvertisementPlacement
        | None
    ) = None

    area_id: UUID | None = None

    preferred_start_date: date | None = None

    @field_validator(
        "business_name",
        "headline",
        "description",
        "call_to_action",
    )
    @classmethod
    def clean_optional_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned = " ".join(
            value.split()
        )

        if not cleaned:
            raise ValueError(
                "This field cannot be empty."
            )

        return cleaned

    @field_validator(
        "contact_phone",
    )
    @classmethod
    def clean_optional_phone(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()

        return cleaned or None


class AdvertisementRead(
    ORMModel,
):
    id: UUID
    reference: str

    business_name: str
    headline: str
    description: str
    call_to_action: str
    destination_url: str

    contact_email: str
    contact_phone: str | None

    image_url: str
    image_public_id: str

    placement: AdvertisementPlacement
    status: AdvertisementStatus

    area_id: UUID | None

    amount_kobo: int
    currency: str
    duration_days: int

    preferred_start_date: date | None
    starts_at: datetime | None
    ends_at: datetime | None

    approved_at: datetime | None
    rejected_at: datetime | None
    completed_at: datetime | None

    review_notes: str | None
    rejection_reason: str | None

    impression_count: int
    click_count: int

    created_at: datetime
    updated_at: datetime


class AdvertisementCreateResponse(
    BaseModel,
):
    advertisement: AdvertisementRead

    # Returned only once. The frontend must place it in the
    # advertiser's private management URL.
    management_token: str


class AdvertisementManagementRequest(
    BaseModel,
):
    management_token: str = Field(
        min_length=20,
        max_length=500,
    )

    @field_validator(
        "management_token",
    )
    @classmethod
    def clean_management_token(
        cls,
        value: str,
    ) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError(
                "Advertisement management "
                "token is required."
            )

        return cleaned


class AdvertisementManagedUpdateRequest(
    AdvertisementUpdateRequest,
):
    management_token: str = Field(
        min_length=20,
        max_length=500,
    )

    @field_validator(
        "management_token",
    )
    @classmethod
    def clean_update_management_token(
        cls,
        value: str,
    ) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError(
                "Advertisement management "
                "token is required."
            )

        return cleaned