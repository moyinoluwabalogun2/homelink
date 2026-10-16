from datetime import (
    UTC,
    datetime,
)

from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Select,
    or_,
    select,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from sqlalchemy.orm import (
    selectinload,
)

from app.models.enums import (
    ListingStatus,
    ListingType,
)

from app.models.listing import (
    BuyPropertyDetails,
    Listing,
    MarketplaceDetails,
    RentalDetails,
)


class ListingRepository:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    @staticmethod
    def _options():
        return (
            selectinload(
                Listing.media
            ),
            selectinload(
                Listing.rental_details
            ),
            selectinload(
                Listing.buy_property_details
            ),
            selectinload(
                Listing.marketplace_details
            ),
        )

    # ============================================================
    # ACTIVE/NON-DELETED LISTING
    # ============================================================

    async def get_by_id(
        self,
        listing_id: UUID,
    ) -> Listing | None:
        return (
            await self.session.scalar(
                select(
                    Listing
                )
                .options(
                    *self._options()
                )
                .where(
                    Listing.id
                    == listing_id,

                    Listing.deleted_at
                    .is_(None),
                )
            )
        )

    # ============================================================
    # ACTIVE/NON-DELETED LISTING WITH ROW LOCK
    # ============================================================

    async def get_by_id_for_update(
        self,
        listing_id: UUID,
    ) -> Listing | None:
        return (
            await self.session.scalar(
                select(
                    Listing
                )
                .options(
                    *self._options()
                )
                .where(
                    Listing.id
                    == listing_id,

                    Listing.deleted_at
                    .is_(None),
                )
                .with_for_update(
                    of=Listing,
                )
            )
        )

    # ============================================================
    # DELETED LISTING WITH ROW LOCK
    #
    # This remains separate from get_by_id_for_update.
    # Normal listing operations must not accidentally access
    # deleted listings.
    # ============================================================

    async def get_deleted_by_id_for_update(
        self,
        listing_id: UUID,
    ) -> Listing | None:
        return (
            await self.session.scalar(
                select(
                    Listing
                )
                .options(
                    *self._options()
                )
                .where(
                    Listing.id
                    == listing_id,

                    Listing.deleted_at
                    .is_not(None),
                )
                .with_for_update(
                    of=Listing,
                )
            )
        )

    # ============================================================
    # PUBLIC SINGLE LISTING
    # ============================================================

    async def get_public_by_id(
        self,
        listing_id: UUID,
    ) -> Listing | None:
        now = datetime.now(
            UTC
        )

        return (
            await self.session.scalar(
                select(
                    Listing
                )
                .options(
                    *self._options()
                )
                .where(
                    Listing.id
                    == listing_id,

                    Listing.status
                    == (
                        ListingStatus
                        .PUBLISHED
                    ),

                    Listing.deleted_at
                    .is_(None),

                    or_(
                        Listing.expires_at
                        .is_(None),

                        Listing.expires_at
                        > now,
                    ),
                )
            )
        )

    # ============================================================
    # PUBLIC LIST
    # ============================================================

    async def list_public(
        self,
        *,
        listing_type: (
            ListingType | None
        ),
        area_id: UUID | None,
        min_price: Decimal | None,
        max_price: Decimal | None,
        query: str | None,
        category: str | None,
        sort: str,
        limit: int,
        offset: int,
    ) -> list[Listing]:
        now = datetime.now(
            UTC
        )

        statement: Select[
            tuple[Listing]
        ] = (
            select(
                Listing
            )
            .options(
                *self._options()
            )
            .where(
                Listing.status
                == (
                    ListingStatus
                    .PUBLISHED
                ),

                Listing.deleted_at
                .is_(None),

                or_(
                    Listing.expires_at
                    .is_(None),

                    Listing.expires_at
                    > now,
                ),
            )
        )

        if (
            listing_type
            is not None
        ):
            statement = (
                statement.where(
                    Listing.listing_type
                    == listing_type
                )
            )

        if (
            area_id
            is not None
        ):
            statement = (
                statement.where(
                    Listing.area_id
                    == area_id
                )
            )

        if (
            min_price
            is not None
        ):
            statement = (
                statement.where(
                    Listing.price
                    >= min_price
                )
            )

        if (
            max_price
            is not None
        ):
            statement = (
                statement.where(
                    Listing.price
                    <= max_price
                )
            )

        if query:
            pattern = (
                f"%{query.strip()}%"
            )

            statement = (
                statement.where(
                    or_(
                        Listing.title
                        .ilike(
                            pattern
                        ),

                        Listing.description
                        .ilike(
                            pattern
                        ),
                    )
                )
            )

        # Category belongs to a different details table depending
        # on the listing type. Using relationship.has() produces
        # an EXISTS query without multiplying listing rows.
        if (
            category
            and listing_type
            is not None
        ):
            if (
                listing_type
                == ListingType.RENTAL
            ):
                statement = (
                    statement.where(
                        Listing.rental_details
                        .has(
                            RentalDetails.category
                            == category
                        )
                    )
                )

            elif (
                listing_type
                == ListingType.BUY_PROPERTY
            ):
                statement = (
                    statement.where(
                        Listing.buy_property_details
                        .has(
                            BuyPropertyDetails.category
                            == category
                        )
                    )
                )

            elif (
                listing_type
                == ListingType.MARKETPLACE
            ):
                statement = (
                    statement.where(
                        Listing.marketplace_details
                        .has(
                            MarketplaceDetails.category
                            == category
                        )
                    )
                )

        # Every ordering ends with the primary key. This makes
        # offset pagination deterministic when prices or dates
        # are identical.
        if sort == "price_low":
            ordering = (
                Listing.price.asc(),
                Listing.id.asc(),
            )

        elif sort == "price_high":
            ordering = (
                Listing.price.desc(),
                Listing.id.asc(),
            )

        elif sort == "newest":
            ordering = (
                Listing.published_at
                .desc(),
                Listing.id.asc(),
            )

        else:
            ordering = (
                Listing.is_featured
                .desc(),
                Listing.published_at
                .desc(),
                Listing.id.asc(),
            )

        statement = (
            statement
            .order_by(
                *ordering
            )
            .limit(
                limit
            )
            .offset(
                offset
            )
        )

        result = (
            await self.session.scalars(
                statement
            )
        )

        return list(
            result.unique().all()
        )

    # ============================================================
    # OWNER LISTINGS
    # ============================================================

    async def list_mine(
        self,
        owner_id: UUID,
        *,
        limit: int,
        offset: int,
    ) -> list[Listing]:
        result = (
            await self.session.scalars(
                select(
                    Listing
                )
                .options(
                    *self._options()
                )
                .where(
                    Listing.owner_id
                    == owner_id,

                    Listing.deleted_at
                    .is_(None),
                )
                .order_by(
                    Listing.created_at
                    .desc()
                )
                .limit(
                    limit
                )
                .offset(
                    offset
                )
            )
        )

        return list(
            result.unique().all()
        )

    # ============================================================
    # OWNER RECENTLY DELETED
    # ============================================================

    async def list_recently_deleted(
        self,
        owner_id: UUID,
        *,
        limit: int,
        offset: int,
    ) -> list[Listing]:
        now = datetime.now(
            UTC
        )

        result = (
            await self.session.scalars(
                select(
                    Listing
                )
                .options(
                    *self._options()
                )
                .where(
                    Listing.owner_id
                    == owner_id,

                    Listing.deleted_at
                    .is_not(None),

                    Listing.media_purge_after
                    .is_not(None),

                    Listing.media_purge_after
                    > now,
                )
                .order_by(
                    Listing.deleted_at
                    .desc()
                )
                .limit(
                    limit
                )
                .offset(
                    offset
                )
            )
        )

        return list(
            result.unique().all()
        )

    # ============================================================
    # ADMIN MODERATION
    # ============================================================

    async def list_pending(
        self,
        *,
        limit: int,
        offset: int,
    ) -> list[Listing]:
        result = (
            await self.session.scalars(
                select(
                    Listing
                )
                .options(
                    *self._options()
                )
                .where(
                    Listing.status
                    == (
                        ListingStatus
                        .PENDING
                    ),

                    Listing.deleted_at
                    .is_(None),
                )
                .order_by(
                    Listing.updated_at
                    .asc()
                )
                .limit(
                    limit
                )
                .offset(
                    offset
                )
            )
        )

        return list(
            result.unique().all()
        )