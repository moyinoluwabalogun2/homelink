from __future__ import annotations

import json
import logging
from datetime import (
    UTC,
    datetime,
)
from uuid import UUID

from redis.asyncio import Redis
from sqlalchemy import (
    select,
    update,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.models.advertising import (
    Advertisement,
)
from app.models.enums import (
    AdvertisementPlacement,
    AdvertisementStatus,
)
from app.repositories.advertising_repository import (
    AdvertisingRepository,
)
from app.schemas.public_advertising import (
    PublicAdvertisementRead,
)


logger = logging.getLogger(
    __name__
)


class AdvertisementDeliveryService:
    LIVE_CACHE_SECONDS = 60

    IMPRESSION_DEDUPE_SECONDS = (
        6 * 60 * 60
    )

    CLICK_DEDUPE_SECONDS = (
        5 * 60
    )

    def __init__(
        self,
        session: AsyncSession,
        redis: Redis,
    ) -> None:
        self.session = session
        self.redis = redis

        self.repository = (
            AdvertisingRepository(
                session
            )
        )

    async def list_live(
        self,
        *,
        placement: AdvertisementPlacement,
        area_id: UUID | None,
    ) -> list[
        PublicAdvertisementRead
    ]:
        """
        Return at most three eligible adverts.

        Results are cached for 60 seconds by placement and area.
        Redis failure safely falls back to PostgreSQL.
        """

        cache_key = (
            "homelink:advertisements:live:"
            f"{placement.value}:"
            f"{area_id or 'all'}"
        )

        try:
            cached = await self.redis.get(
                cache_key
            )

        except Exception:
            logger.warning(
                "Advertisement delivery cache "
                "read failed.",
                exc_info=True,
            )

            cached = None

        if isinstance(
            cached,
            str,
        ):
            try:
                decoded = json.loads(
                    cached
                )

                if isinstance(
                    decoded,
                    list,
                ):
                    return [
                        PublicAdvertisementRead
                        .model_validate(
                            item
                        )
                        for item
                        in decoded
                    ]

            except Exception:
                logger.warning(
                    "Invalid advertisement "
                    "delivery cache ignored.",
                    exc_info=True,
                )

        advertisements = (
            await self.repository
            .list_public_for_placement(
                placement=placement,
                area_id=area_id,
                limit=3,
            )
        )

        public_items = [
            PublicAdvertisementRead
            .model_validate(
                advertisement
            )
            for advertisement
            in advertisements
        ]

        try:
            serialized = json.dumps(
                [
                    item.model_dump(
                        mode="json"
                    )
                    for item
                    in public_items
                ],
                separators=(
                    ",",
                    ":",
                ),
            )

            await self.redis.setex(
                cache_key,
                self.LIVE_CACHE_SECONDS,
                serialized,
            )

        except Exception:
            logger.warning(
                "Advertisement delivery cache "
                "write failed.",
                exc_info=True,
            )

        return public_items

    async def record_impression(
        self,
        *,
        advertisement_id: UUID,
        visitor_fingerprint: str,
    ) -> bool:
        """
        Count at most one impression for the same advert and
        visitor fingerprint every six hours.

        Redis absorbs repeat refreshes without additional
        PostgreSQL writes.
        """

        dedupe_key = (
            "homelink:advertisement:"
            f"{advertisement_id}:"
            "impression:"
            f"{visitor_fingerprint}"
        )

        try:
            accepted = await self.redis.set(
                dedupe_key,
                "1",
                nx=True,
                ex=(
                    self
                    .IMPRESSION_DEDUPE_SECONDS
                ),
            )

        except Exception:
            # Tracking must never slow or break public pages.
            logger.warning(
                "Advertisement impression "
                "deduplication unavailable.",
                exc_info=True,
            )

            return False

        if not accepted:
            return False

        now = datetime.now(
            UTC
        )

        try:
            updated_id = (
                await self.session.scalar(
                    update(
                        Advertisement
                    )
                    .where(
                        Advertisement.id
                        == advertisement_id,
                        Advertisement.status
                        == AdvertisementStatus
                        .LIVE,
                        Advertisement.starts_at
                        .is_not(None),
                        Advertisement.starts_at
                        <= now,
                        Advertisement.ends_at
                        .is_not(None),
                        Advertisement.ends_at
                        > now,
                    )
                    .values(
                        impression_count=(
                            Advertisement
                            .impression_count
                            + 1
                        )
                    )
                    .returning(
                        Advertisement.id
                    )
                    .execution_options(
                        synchronize_session=False
                    )
                )
            )

            await self.session.commit()

        except Exception:
            await self.session.rollback()

            try:
                await self.redis.delete(
                    dedupe_key
                )

            except Exception:
                pass

            raise

        if updated_id is None:
            try:
                await self.redis.delete(
                    dedupe_key
                )

            except Exception:
                pass

            return False

        return True

    async def get_click_destination(
        self,
        *,
        advertisement_id: UUID,
        visitor_fingerprint: str,
    ) -> str | None:
        """
        Return the stored destination of a currently live advert.

        A repeat click still redirects normally, but Redis
        prevents repeated refreshes from inflating the counter.
        """

        now = datetime.now(
            UTC
        )

        destination_url = (
            await self.session.scalar(
                select(
                    Advertisement
                    .destination_url
                )
                .where(
                    Advertisement.id
                    == advertisement_id,
                    Advertisement.status
                    == AdvertisementStatus
                    .LIVE,
                    Advertisement.starts_at
                    .is_not(None),
                    Advertisement.starts_at
                    <= now,
                    Advertisement.ends_at
                    .is_not(None),
                    Advertisement.ends_at
                    > now,
                )
            )
        )

        if not isinstance(
            destination_url,
            str,
        ):
            return None

        clean_destination = (
            destination_url.strip()
        )

        if not (
            clean_destination.startswith(
                "https://"
            )
            or clean_destination.startswith(
                "http://"
            )
        ):
            return None

        dedupe_key = (
            "homelink:advertisement:"
            f"{advertisement_id}:"
            "click:"
            f"{visitor_fingerprint}"
        )

        should_count = False

        try:
            should_count = bool(
                await self.redis.set(
                    dedupe_key,
                    "1",
                    nx=True,
                    ex=(
                        self
                        .CLICK_DEDUPE_SECONDS
                    ),
                )
            )

        except Exception:
            # A Redis tracking interruption must not prevent the
            # visitor from reaching the advertiser.
            logger.warning(
                "Advertisement click "
                "deduplication unavailable.",
                exc_info=True,
            )

        if should_count:
            try:
                await self.session.execute(
                    update(
                        Advertisement
                    )
                    .where(
                        Advertisement.id
                        == advertisement_id,
                        Advertisement.status
                        == AdvertisementStatus
                        .LIVE,
                    )
                    .values(
                        click_count=(
                            Advertisement
                            .click_count
                            + 1
                        )
                    )
                    .execution_options(
                        synchronize_session=False
                    )
                )

                await self.session.commit()

            except Exception:
                await self.session.rollback()

                try:
                    await self.redis.delete(
                        dedupe_key
                    )

                except Exception:
                    pass

                logger.exception(
                    "Advertisement click count "
                    "could not be recorded."
                )

        return clean_destination