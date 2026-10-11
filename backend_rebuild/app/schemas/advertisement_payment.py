from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)

from app.models.enums import (
    PaymentProvider,
    PaymentStatus,
)
from app.schemas.common import ORMModel


class AdvertisementPaymentInitializeRequest(
    BaseModel,
):
    management_token: str = Field(
        min_length=20,
        max_length=500,
    )

    provider: PaymentProvider | None = None

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


class AdvertisementPaymentVerifyRequest(
    BaseModel,
):
    management_token: str = Field(
        min_length=20,
        max_length=500,
    )

    reference: str = Field(
        min_length=8,
        max_length=120,
    )

    @field_validator(
        "management_token",
        "reference",
    )
    @classmethod
    def clean_required_value(
        cls,
        value: str,
    ) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError(
                "This value is required."
            )

        return cleaned


class AdvertisementPaymentRead(
    ORMModel,
):
    id: UUID
    advertisement_id: UUID
    reference: str
    provider: PaymentProvider
    status: PaymentStatus
    amount_kobo: int
    currency: str
    authorization_url: str | None
    provider_transaction_id: str | None
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AdvertisementPaymentInitializeResponse(
    BaseModel,
):
    payment: AdvertisementPaymentRead
    authorization_url: str