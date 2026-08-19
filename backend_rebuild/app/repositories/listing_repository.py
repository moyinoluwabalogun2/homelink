from decimal import Decimal
from uuid import UUID

from sqlalchemy import Select, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import ListingStatus, ListingType
from app.models.listing import Listing


class ListingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _options():
        return (
            selectinload(Listing.media),
            selectinload(Listing.rental_details),
            selectinload(Listing.buy_property_details),
            selectinload(Listing.marketplace_details),
        )

    async def get_by_id(self, listing_id: UUID) -> Listing | None:
        return await self.session.scalar(
            select(Listing)
            .options(*self._options())
            .where(
                Listing.id == listing_id,
                Listing.deleted_at.is_(None),
            )
        )

    async def list_public(
        self,
        *,
        listing_type: ListingType | None,
        area_id: UUID | None,
        min_price: Decimal | None,
        max_price: Decimal | None,
        query: str | None,
        limit: int,
        offset: int,
    ) -> list[Listing]:
        statement: Select[tuple[Listing]] = (
            select(Listing)
            .options(*self._options())
            .where(
                Listing.status == ListingStatus.PUBLISHED,
                Listing.deleted_at.is_(None),
            )
        )

        if listing_type is not None:
            statement = statement.where(Listing.listing_type == listing_type)
        if area_id is not None:
            statement = statement.where(Listing.area_id == area_id)
        if min_price is not None:
            statement = statement.where(Listing.price >= min_price)
        if max_price is not None:
            statement = statement.where(Listing.price <= max_price)
        if query:
            pattern = f"%{query.strip()}%"
            statement = statement.where(
                or_(
                    Listing.title.ilike(pattern),
                    Listing.description.ilike(pattern),
                )
            )

        statement = (
            statement
            .order_by(Listing.is_featured.desc(), Listing.published_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.scalars(statement)
        return list(result.unique().all())

    async def list_mine(self, owner_id: UUID) -> list[Listing]:
        result = await self.session.scalars(
            select(Listing)
            .options(*self._options())
            .where(
                Listing.owner_id == owner_id,
                Listing.deleted_at.is_(None),
            )
            .order_by(Listing.created_at.desc())
        )
        return list(result.unique().all())

    async def list_pending(self) -> list[Listing]:
        result = await self.session.scalars(
            select(Listing)
            .options(*self._options())
            .where(
                Listing.status == ListingStatus.PENDING,
                Listing.deleted_at.is_(None),
            )
            .order_by(Listing.updated_at.asc())
        )
        return list(result.unique().all())