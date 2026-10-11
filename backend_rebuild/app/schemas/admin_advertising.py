from __future__ import annotations

from datetime import date

from pydantic import (
    BaseModel,
    Field,
    model_validator,
)

from app.schemas.advertisement_payment import (
    AdvertisementPaymentRead,
)
from app.schemas.advertising import (
    AdvertisementRead,
)


class AdvertisementApproveRequest(
    BaseModel,
):
    go_live_now: bool = True

    scheduled_start_date: (
        date | None
    ) = None

    review_notes: str | None = Field(
        default=None,
        max_length=1000,
    )

    @model_validator(
        mode="after",
    )
    def validate_schedule(
        self,
    ):
        if (
            self.go_live_now
            and self.scheduled_start_date
            is not None
        ):
            raise ValueError(
                "Choose either immediate "
                "publication or a scheduled date."
            )

        if (
            not self.go_live_now
            and self.scheduled_start_date
            is None
        ):
            raise ValueError(
                "A scheduled start date "
                "is required."
            )

        if self.review_notes is not None:
            cleaned = (
                self.review_notes
                .strip()
            )

            self.review_notes = (
                cleaned or None
            )

        return self


class AdvertisementModerationReasonRequest(
    BaseModel,
):
    reason: str = Field(
        min_length=5,
        max_length=1000,
    )

    @model_validator(
        mode="after",
    )
    def clean_reason(
        self,
    ):
        self.reason = " ".join(
            self.reason.split()
        )

        if not self.reason:
            raise ValueError(
                "A moderation reason "
                "is required."
            )

        return self


class AdminAdvertisementRead(
    AdvertisementRead,
):
    payments: list[
        AdvertisementPaymentRead
    ] = []


class AdminAdvertisementListResponse(
    BaseModel,
):
    items: list[
        AdminAdvertisementRead
    ]

    total: int
    limit: int
    offset: int