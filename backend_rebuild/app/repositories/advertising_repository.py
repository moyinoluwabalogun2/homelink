from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import (
    delete,
    or_,
    select,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)
from sqlalchemy.orm import (
    selectinload,
)

from app.models.advertising import (
    Advertisement,
    AdvertisementPayment,
)
from app.models.enums import (
    AdvertisementPlacement,
    AdvertisementStatus,
    PaymentStatus,
)
from app.models.media_cleanup import (
    MediaCleanupJob,
)


class AdvertisingRepository:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    @staticmethod
    def _read_options():
        return (
            selectinload(
                Advertisement.area
            ),
        )

    @staticmethod
    def _management_options():
        return (
            selectinload(
                Advertisement.area
            ),
            selectinload(
                Advertisement.payments
            ),
        )

    async def create(
        self,
        advertisement: Advertisement,
    ) -> Advertisement:
        self.session.add(
            advertisement
        )

        await self.session.flush()

        return advertisement

    async def get_by_id(
        self,
        advertisement_id: UUID,
    ) -> Advertisement | None:
        return await self.session.scalar(
            select(
                Advertisement
            )
            .options(
                *self._read_options()
            )
            .where(
                Advertisement.id
                == advertisement_id,
            )
        )

    async def get_by_reference(
        self,
        reference: str,
    ) -> Advertisement | None:
        return await self.session.scalar(
            select(
                Advertisement
            )
            .options(
                *self._management_options()
            )
            .where(
                Advertisement.reference
                == reference,
            )
        )

    async def get_by_reference_for_update(
        self,
        reference: str,
    ) -> Advertisement | None:
        return await self.session.scalar(
            select(
                Advertisement
            )
            .where(
                Advertisement.reference
                == reference,
            )
            .with_for_update()
        )

    async def get_by_management_token_hash(
        self,
        token_hash: str,
    ) -> Advertisement | None:
        return await self.session.scalar(
            select(
                Advertisement
            )
            .options(
                *self._management_options()
            )
            .where(
                Advertisement.management_token_hash
                == token_hash,
            )
        )

    async def get_by_management_token_hash_for_update(
        self,
        token_hash: str,
    ) -> Advertisement | None:
        return await self.session.scalar(
            select(
                Advertisement
            )
            .where(
                Advertisement.management_token_hash
                == token_hash,
            )
            .with_for_update()
        )

    async def image_is_claimed(
        self,
        public_id: str,
    ) -> bool:
        existing_id = await self.session.scalar(
            select(
                Advertisement.id
            )
            .where(
                Advertisement.image_public_id
                == public_id,
            )
            .limit(1)
        )

        return existing_id is not None

    async def release_cleanup_job(
        self,
        *,
        public_id: str,
    ) -> int:
        """
        Remove an unclaimed-upload cleanup record after an
        Advertisement row has claimed the same Cloudinary image.

        This runs in the same database transaction as advert
        creation, so a rollback restores both operations.
        """

        result = await self.session.execute(
            delete(
                MediaCleanupJob
            ).where(
                MediaCleanupJob.storage_public_id
                == public_id,
                MediaCleanupJob.resource_type
                == "image",
                MediaCleanupJob.delivery_type
                == "upload",
            )
        )

        return int(
            result.rowcount or 0
        )

    async def list_public_for_placement(
        self,
        *,
        placement: AdvertisementPlacement,
        area_id: UUID | None,
        limit: int = 3,
    ) -> list[Advertisement]:
        now = datetime.now(
            UTC
        )

        statement = (
            select(
                Advertisement
            )
            .options(
                *self._read_options()
            )
            .where(
                Advertisement.placement
                == placement,
                Advertisement.status
                == AdvertisementStatus.LIVE,
                Advertisement.starts_at.is_not(
                    None
                ),
                Advertisement.starts_at
                <= now,
                Advertisement.ends_at.is_not(
                    None
                ),
                Advertisement.ends_at
                > now,
            )
        )

        if area_id is not None:
            statement = statement.where(
                or_(
                    Advertisement.area_id
                    == area_id,
                    Advertisement.area_id.is_(
                        None
                    ),
                )
            )

        statement = (
            statement
            .order_by(
                Advertisement.area_id
                .is_(None)
                .asc(),
                Advertisement.starts_at.asc(),
                Advertisement.created_at.asc(),
            )
            .limit(
                max(
                    1,
                    min(
                        limit,
                        3,
                    ),
                )
            )
        )

        result = await self.session.scalars(
            statement
        )

        return list(
            result.all()
        )

    async def latest_successful_payment(
        self,
        *,
        advertisement_id: UUID,
    ) -> AdvertisementPayment | None:
        return await self.session.scalar(
            select(
                AdvertisementPayment
            )
            .where(
                AdvertisementPayment.advertisement_id
                == advertisement_id,
                AdvertisementPayment.status
                == PaymentStatus.SUCCESS,
            )
            .order_by(
                AdvertisementPayment.paid_at.desc(),
                AdvertisementPayment.created_at.desc(),
            )
            .limit(1)
        )