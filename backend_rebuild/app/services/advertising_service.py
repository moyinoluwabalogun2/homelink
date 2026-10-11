from __future__ import annotations

import secrets
from datetime import UTC, date, datetime
from hashlib import sha256
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.models.advertising import (
    Advertisement,
)
from app.models.enums import (
    AdvertisementStatus,
)
from app.models.location import Area
from app.repositories.advertising_repository import (
    AdvertisingRepository,
)
from app.schemas.advertising import (
    AdvertisementCreateRequest,
    AdvertisementUpdateRequest,
)
from app.services.advertisement_asset_service import (
    AdvertisementAssetService,
)
from app.services.media_service import (
    MediaService,
)


ADVERTISEMENT_PRICE_KOBO = 500_000
ADVERTISEMENT_CURRENCY = "NGN"
ADVERTISEMENT_DURATION_DAYS = 7


class AdvertisingService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

        self.repository = (
            AdvertisingRepository(
                session
            )
        )

        self.media = MediaService(
            session
        )

        self.assets = (
            AdvertisementAssetService()
        )

    async def create_advertisement(
        self,
        *,
        payload: AdvertisementCreateRequest,
    ) -> tuple[
        Advertisement,
        str,
    ]:
        """
        Create an unpaid advertisement campaign.

        The advert remains PAYMENT_PENDING until a verified
        payment succeeds. Its seven-day timer does not start
        during creation, payment or moderation.
        """

        image_public_id = (
            payload.image_public_id.strip()
        )

        self.media.verify_advertisement_claim_token(
            public_id=image_public_id,
            claim_token=(
                payload.image_claim_token
            ),
        )

        if await self.repository.image_is_claimed(
            image_public_id
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "This advertisement image "
                    "has already been used."
                ),
            )

        await self._require_active_area(
            payload.area_id
        )

        verified_image = (
            await self.assets.verify_image(
                public_id=image_public_id,
            )
        )

        management_token = (
            secrets.token_urlsafe(
                32
            )
        )

        management_token_hash = (
            self.hash_management_token(
                management_token
            )
        )

        reference = (
            "HLAD-"
            f"{uuid4().hex.upper()}"
        )

        advertisement = Advertisement(
            reference=reference,
            management_token_hash=(
                management_token_hash
            ),
            business_name=(
                payload.business_name
            ),
            headline=payload.headline,
            description=(
                payload.description
            ),
            call_to_action=(
                payload.call_to_action
            ),
            destination_url=str(
                payload.destination_url
            ),
            contact_email=str(
                payload.contact_email
            ).lower(),
            contact_phone=(
                payload.contact_phone
            ),
            image_url=(
                verified_image.secure_url
            ),
            image_public_id=(
                verified_image.public_id
            ),
            placement=(
                payload.placement
            ),
            status=(
                AdvertisementStatus
                .PAYMENT_PENDING
            ),
            area_id=payload.area_id,
            amount_kobo=(
                ADVERTISEMENT_PRICE_KOBO
            ),
            currency=(
                ADVERTISEMENT_CURRENCY
            ),
            duration_days=(
                ADVERTISEMENT_DURATION_DAYS
            ),
            preferred_start_date=(
                payload.preferred_start_date
            ),
            starts_at=None,
            ends_at=None,
            approved_at=None,
            rejected_at=None,
            completed_at=None,
            reviewed_by_user_id=None,
            review_notes=None,
            rejection_reason=None,
            impression_count=0,
            click_count=0,
        )

        await self.repository.create(
            advertisement
        )

        # The Advertisement row has now claimed the image.
        # Removing the cleanup job in this same transaction
        # prevents a valid paid advert from losing its image.
        await self.repository.release_cleanup_job(
            public_id=(
                verified_image.public_id
            ),
        )

        return (
            advertisement,
            management_token,
        )

    async def get_managed_advertisement(
        self,
        *,
        management_token: str,
    ) -> Advertisement:
        token_hash = (
            self.hash_management_token(
                management_token
            )
        )

        advertisement = (
            await self.repository
            .get_by_management_token_hash(
                token_hash
            )
        )

        if advertisement is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Advertisement could "
                    "not be found."
                ),
            )

        return advertisement

    async def update_managed_advertisement(
        self,
        *,
        management_token: str,
        payload: AdvertisementUpdateRequest,
    ) -> Advertisement:
        token_hash = (
            self.hash_management_token(
                management_token
            )
        )

        advertisement = (
            await self.repository
            .get_by_management_token_hash_for_update(
                token_hash
            )
        )

        if advertisement is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Advertisement could "
                    "not be found."
                ),
            )

        editable_statuses = {
            AdvertisementStatus
            .PAYMENT_PENDING,
            AdvertisementStatus
            .CHANGES_REQUESTED,
            AdvertisementStatus
            .REJECTED,
        }

        if (
            advertisement.status
            not in editable_statuses
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "This advertisement cannot "
                    "be edited in its current state."
                ),
            )

        update_values = (
            payload.model_dump(
                exclude_unset=True
            )
        )

        if "area_id" in update_values:
            await self._require_active_area(
                update_values[
                    "area_id"
                ]
            )

        if (
            "destination_url"
            in update_values
            and update_values[
                "destination_url"
            ] is not None
        ):
            update_values[
                "destination_url"
            ] = str(
                update_values[
                    "destination_url"
                ]
            )

        if (
            "contact_email"
            in update_values
            and update_values[
                "contact_email"
            ] is not None
        ):
            update_values[
                "contact_email"
            ] = str(
                update_values[
                    "contact_email"
                ]
            ).lower()

        for (
            field_name,
            value,
        ) in update_values.items():
            setattr(
                advertisement,
                field_name,
                value,
            )

        if (
            advertisement.status
            in {
                AdvertisementStatus
                .CHANGES_REQUESTED,
                AdvertisementStatus
                .REJECTED,
            }
        ):
            advertisement.status = (
                AdvertisementStatus
                .PENDING_REVIEW
            )

            advertisement.rejected_at = None
            advertisement.rejection_reason = None
            advertisement.review_notes = None

        advertisement.updated_at = (
            datetime.now(
                UTC
            )
        )

        await self.session.flush()

        return advertisement

    async def cancel_managed_advertisement(
        self,
        *,
        management_token: str,
    ) -> Advertisement:
        token_hash = (
            self.hash_management_token(
                management_token
            )
        )

        advertisement = (
            await self.repository
            .get_by_management_token_hash_for_update(
                token_hash
            )
        )

        if advertisement is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Advertisement could "
                    "not be found."
                ),
            )

        if advertisement.status in {
            AdvertisementStatus.LIVE,
            AdvertisementStatus.COMPLETED,
            AdvertisementStatus.CANCELLED,
            AdvertisementStatus.REFUNDED,
        }:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This advertisement cannot "
                    "be cancelled in its current state."
                ),
            )

        advertisement.status = (
            AdvertisementStatus.CANCELLED
        )

        advertisement.updated_at = (
            datetime.now(
                UTC
            )
        )

        await self.session.flush()

        return advertisement

    async def _require_active_area(
        self,
        area_id,
    ) -> None:
        if area_id is None:
            return

        area = await self.session.get(
            Area,
            area_id,
        )

        if (
            area is None
            or not area.is_active
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "The selected advert area "
                    "is unavailable."
                ),
            )

    @staticmethod
    def hash_management_token(
        token: str,
    ) -> str:
        clean_token = token.strip()

        if not clean_token:
            return sha256(
                b"invalid-empty-token"
            ).hexdigest()

        return sha256(
            clean_token.encode(
                "utf-8"
            )
        ).hexdigest()