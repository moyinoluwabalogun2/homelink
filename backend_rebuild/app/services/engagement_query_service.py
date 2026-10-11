from __future__ import annotations

from sqlalchemy import (
    select,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from sqlalchemy.orm import (
    selectinload,
)

from app.models.engagement import (
    Inquiry,
    ListingReport,
    SavedListing,
)

from app.models.enums import (
    ListingStatus,
    ReportStatus,
)

from app.models.listing import (
    Listing,
)

from app.models.user import (
    User,
)


class EngagementQueryService:
    """
    Bounded, read-only engagement queries.

    Keeping list queries separate prevents large collections from
    being loaded accidentally while leaving write workflows and
    notification behaviour in EngagementService unchanged.
    """

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    # =========================================================
    # SAVED LISTINGS
    # =========================================================

    async def list_saved(
        self,
        *,
        user: User,
        limit: int,
        offset: int,
    ) -> list[SavedListing]:
        result = (
            await self.session.scalars(
                select(
                    SavedListing
                )
                .options(
                    selectinload(
                        SavedListing.listing
                    )
                )
                .join(
                    SavedListing.listing
                )
                .where(
                    SavedListing.user_id
                    == user.id,

                    Listing.status
                    == ListingStatus.PUBLISHED,

                    Listing.deleted_at
                    .is_(None),
                )
                .order_by(
                    SavedListing.created_at
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

    # =========================================================
    # LEGACY SENT INQUIRIES
    # =========================================================

    async def list_sent(
        self,
        *,
        user: User,
        limit: int,
        offset: int,
    ) -> list[Inquiry]:
        return await self._list_inquiries(
            condition=(
                Inquiry.sender_id
                == user.id
            ),
            limit=limit,
            offset=offset,
        )

    # =========================================================
    # LEGACY RECEIVED INQUIRIES
    # =========================================================

    async def list_received(
        self,
        *,
        user: User,
        limit: int,
        offset: int,
    ) -> list[Inquiry]:
        return await self._list_inquiries(
            condition=(
                Inquiry.recipient_id
                == user.id
            ),
            limit=limit,
            offset=offset,
        )

    # =========================================================
    # CURRENT USER REPORTS
    # =========================================================

    async def list_my_reports(
        self,
        *,
        user: User,
        limit: int,
        offset: int,
    ) -> list[ListingReport]:
        result = (
            await self.session.scalars(
                select(
                    ListingReport
                )
                .where(
                    ListingReport.reporter_id
                    == user.id
                )
                .order_by(
                    ListingReport.created_at
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

    # =========================================================
    # ADMIN REPORT QUEUE
    # =========================================================

    async def list_admin_reports(
        self,
        *,
        status: ReportStatus | None,
        limit: int,
        offset: int,
    ) -> list[ListingReport]:
        statement = select(
            ListingReport
        )

        if status is not None:
            statement = (
                statement.where(
                    ListingReport.status
                    == status
                )
            )

        result = (
            await self.session.scalars(
                statement
                .order_by(
                    ListingReport.created_at
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

    # =========================================================
    # INTERNAL BOUNDED INQUIRY QUERY
    # =========================================================

    async def _list_inquiries(
        self,
        *,
        condition,
        limit: int,
        offset: int,
    ) -> list[Inquiry]:
        result = (
            await self.session.scalars(
                select(
                    Inquiry
                )
                .where(
                    condition
                )
                .order_by(
                    Inquiry.created_at
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