from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from datetime import (
    UTC,
    datetime,
)

from redis.asyncio import Redis
from sqlalchemy import (
    func,
    or_,
    select,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.core.config import (
    get_settings,
)
from app.models.enums import (
    ListingStatus,
)
from app.models.listing import (
    Listing,
)
from app.models.user import User
from app.schemas.live_statistics import (
    LiveStatisticsRead,
)


settings = get_settings()

logger = logging.getLogger(
    __name__
)


class LiveStatisticsService:
    ONLINE_WINDOW_SECONDS = 5 * 60

    DATABASE_CACHE_SECONDS = 60

    TOTAL_VISITORS_KEY = (
        "homelink:statistics:"
        "visitors:all"
    )

    ONLINE_VISITORS_KEY = (
        "homelink:statistics:"
        "visitors:online"
    )

    DATABASE_COUNTS_KEY = (
        "homelink:statistics:"
        "database-counts:v1"
    )

    def __init__(
        self,
        session: AsyncSession,
        redis: Redis,
    ) -> None:
        self.session = session
        self.redis = redis

    @staticmethod
    def create_visitor_key(
        *,
        client_ip: str,
        user_agent: str,
    ) -> str:
        """
        Create a one-way keyed identifier.

        Raw IP addresses and browser strings are never stored in
        the visitor counters.
        """

        message = (
            f"{client_ip.strip()}:"
            f"{user_agent.strip()}"
        ).encode(
            "utf-8"
        )

        return hmac.new(
            settings.secret_key.encode(
                "utf-8"
            ),
            message,
            hashlib.sha256,
        ).hexdigest()

    async def get_statistics(
        self,
        *,
        visitor_key: str,
    ) -> LiveStatisticsRead:
        now = datetime.now(
            UTC
        )

        unix_now = int(
            time.time()
        )

        online_cutoff = (
            unix_now
            - self.ONLINE_WINDOW_SECONDS
        )

        total_visits = 0
        people_online = 0

        try:
            pipeline = self.redis.pipeline(
                transaction=False
            )

            # HyperLogLog stores an approximate unique visitor
            # count using very little memory.
            pipeline.pfadd(
                self.TOTAL_VISITORS_KEY,
                visitor_key,
            )

            # Sorted-set presence expires logically after five
            # minutes without a fresh request.
            pipeline.zadd(
                self.ONLINE_VISITORS_KEY,
                {
                    visitor_key: unix_now,
                },
            )

            pipeline.zremrangebyscore(
                self.ONLINE_VISITORS_KEY,
                0,
                online_cutoff,
            )

            pipeline.pfcount(
                self.TOTAL_VISITORS_KEY
            )

            pipeline.zcard(
                self.ONLINE_VISITORS_KEY
            )

            results = await pipeline.execute()

            total_visits = int(
                results[3] or 0
            )

            people_online = int(
                results[4] or 0
            )

        except Exception:
            # Statistics are non-critical and must never block
            # the homepage if Redis is temporarily unavailable.
            logger.warning(
                "Live visitor statistics "
                "could not be updated.",
                exc_info=True,
            )

        (
            registered_users,
            active_listings,
        ) = await self._get_database_counts(
            now=now
        )

        return LiveStatisticsRead(
            total_visits=total_visits,
            people_online=people_online,
            registered_users=(
                registered_users
            ),
            active_listings=(
                active_listings
            ),
            generated_at=now,
        )

    async def _get_database_counts(
        self,
        *,
        now: datetime,
    ) -> tuple[
        int,
        int,
    ]:
        try:
            cached = await self.redis.get(
                self.DATABASE_COUNTS_KEY
            )

        except Exception:
            cached = None

        if isinstance(
            cached,
            str,
        ):
            try:
                decoded = json.loads(
                    cached
                )

                return (
                    int(
                        decoded.get(
                            "registered_users",
                            0,
                        )
                    ),
                    int(
                        decoded.get(
                            "active_listings",
                            0,
                        )
                    ),
                )

            except (
                TypeError,
                ValueError,
                json.JSONDecodeError,
            ):
                pass

        row = (
            await self.session.execute(
                select(
                    select(
                        func.count(
                            User.id
                        )
                    )
                    .where(
                        User.deleted_at
                        .is_(None)
                    )
                    .scalar_subquery()
                    .label(
                        "registered_users"
                    ),
                    select(
                        func.count(
                            Listing.id
                        )
                    )
                    .where(
                        Listing.status
                        == ListingStatus
                        .PUBLISHED,
                        Listing.deleted_at
                        .is_(None),
                        or_(
                            Listing.expires_at
                            .is_(None),
                            Listing.expires_at
                            > now,
                        ),
                    )
                    .scalar_subquery()
                    .label(
                        "active_listings"
                    ),
                )
            )
        ).mappings().one()

        registered_users = int(
            row["registered_users"]
            or 0
        )

        active_listings = int(
            row["active_listings"]
            or 0
        )

        try:
            await self.redis.setex(
                self.DATABASE_COUNTS_KEY,
                self.DATABASE_CACHE_SECONDS,
                json.dumps(
                    {
                        "registered_users":
                            registered_users,
                        "active_listings":
                            active_listings,
                    },
                    separators=(
                        ",",
                        ":",
                    ),
                ),
            )

        except Exception:
            logger.warning(
                "Live database-statistics cache "
                "could not be written.",
                exc_info=True,
            )

        return (
            registered_users,
            active_listings,
        )