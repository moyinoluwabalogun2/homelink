from __future__ import annotations

from datetime import (
    UTC,
    date,
    datetime,
    time,
    timedelta,
)
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import (
    func,
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
from app.models.user import User
from app.services.audit_service import (
    AuditService,
)


class AdminAdvertisingService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

        self.audit = AuditService(
            session
        )

    async def list_advertisements(
        self,
        *,
        status: (
            AdvertisementStatus
            | None
        ),
        placement: (
            AdvertisementPlacement
            | None
        ),
        limit: int,
        offset: int,
    ) -> tuple[
        list[Advertisement],
        int,
    ]:
        filters = []

        if status is not None:
            filters.append(
                Advertisement.status
                == status
            )

        if placement is not None:
            filters.append(
                Advertisement.placement
                == placement
            )

        total = await self.session.scalar(
            select(
                func.count(
                    Advertisement.id
                )
            ).where(
                *filters
            )
        )

        result = await self.session.scalars(
            select(
                Advertisement
            )
            .options(
                selectinload(
                    Advertisement.area
                ),
                selectinload(
                    Advertisement.payments
                ),
            )
            .where(
                *filters
            )
            .order_by(
                Advertisement.created_at
                .desc()
            )
            .limit(
                limit
            )
            .offset(
                offset
            )
        )

        return (
            list(
                result.all()
            ),
            int(
                total or 0
            ),
        )

    async def get_advertisement(
        self,
        advertisement_id: UUID,
    ) -> Advertisement:
        advertisement = (
            await self.session.scalar(
                select(
                    Advertisement
                )
                .options(
                    selectinload(
                        Advertisement.area
                    ),
                    selectinload(
                        Advertisement.payments
                    ),
                )
                .where(
                    Advertisement.id
                    == advertisement_id
                )
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

    async def approve(
        self,
        *,
        admin: User,
        advertisement_id: UUID,
        go_live_now: bool,
        scheduled_start_date: (
            date | None
        ),
        review_notes: str | None,
        request_id: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Advertisement:
        advertisement = (
            await self._get_for_update(
                advertisement_id
            )
        )

        if (
            advertisement.status
            != AdvertisementStatus
            .PENDING_REVIEW
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only advertisements awaiting "
                    "review can be approved."
                ),
            )

        await self._require_successful_payment(
            advertisement
        )

        now = datetime.now(
            UTC
        )

        if go_live_now:
            starts_at = now

            new_status = (
                AdvertisementStatus.LIVE
            )

        else:
            if (
                scheduled_start_date
                is None
            ):
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "A scheduled start date "
                        "is required."
                    ),
                )

            starts_at = datetime.combine(
                scheduled_start_date,
                time.min,
                tzinfo=UTC,
            )

            if starts_at <= now:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "The scheduled start date "
                        "must be in the future."
                    ),
                )

            new_status = (
                AdvertisementStatus
                .SCHEDULED
            )

        advertisement.status = (
            new_status
        )

        advertisement.approved_at = (
            now
        )

        advertisement.rejected_at = None
        advertisement.rejection_reason = None

        advertisement.review_notes = (
            review_notes
        )

        advertisement.reviewed_by_user_id = (
            admin.id
        )

        advertisement.starts_at = (
            starts_at
        )

        advertisement.ends_at = (
            starts_at
            + timedelta(
                days=(
                    advertisement
                    .duration_days
                )
            )
        )

        advertisement.completed_at = None

        self.audit.add(
            action=(
                "advertisement.approved"
            ),
            actor_user_id=admin.id,
            target_type="advertisement",
            target_id=str(
                advertisement.id
            ),
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status_code=200,
            details={
                "reference": (
                    advertisement.reference
                ),
                "new_status": (
                    new_status.value
                ),
                "starts_at": (
                    starts_at.isoformat()
                ),
                "ends_at": (
                    advertisement
                    .ends_at
                    .isoformat()
                ),
                "amount_kobo": (
                    advertisement
                    .amount_kobo
                ),
            },
        )

        await self.session.commit()

        return await self.get_advertisement(
            advertisement.id
        )

    async def request_changes(
        self,
        *,
        admin: User,
        advertisement_id: UUID,
        reason: str,
        request_id: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Advertisement:
        advertisement = (
            await self._get_for_update(
                advertisement_id
            )
        )

        if advertisement.status not in {
            AdvertisementStatus
            .PENDING_REVIEW,
            AdvertisementStatus
            .APPROVED,
            AdvertisementStatus
            .SCHEDULED,
        }:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Changes cannot be requested "
                    "for this advertisement."
                ),
            )

        previous_status = (
            advertisement.status
        )

        advertisement.status = (
            AdvertisementStatus
            .CHANGES_REQUESTED
        )

        advertisement.review_notes = (
            reason
        )

        advertisement.rejection_reason = None
        advertisement.rejected_at = None

        advertisement.reviewed_by_user_id = (
            admin.id
        )

        advertisement.approved_at = None
        advertisement.starts_at = None
        advertisement.ends_at = None
        advertisement.completed_at = None

        self.audit.add(
            action=(
                "advertisement.changes_requested"
            ),
            actor_user_id=admin.id,
            target_type="advertisement",
            target_id=str(
                advertisement.id
            ),
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status_code=200,
            details={
                "reference": (
                    advertisement.reference
                ),
                "previous_status": (
                    previous_status.value
                ),
                "new_status": (
                    AdvertisementStatus
                    .CHANGES_REQUESTED
                    .value
                ),
                "reason": reason,
            },
        )

        await self.session.commit()

        return await self.get_advertisement(
            advertisement.id
        )

    async def reject(
        self,
        *,
        admin: User,
        advertisement_id: UUID,
        reason: str,
        request_id: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Advertisement:
        advertisement = (
            await self._get_for_update(
                advertisement_id
            )
        )

        if advertisement.status not in {
            AdvertisementStatus
            .PENDING_REVIEW,
            AdvertisementStatus
            .CHANGES_REQUESTED,
            AdvertisementStatus
            .APPROVED,
            AdvertisementStatus
            .SCHEDULED,
        }:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This advertisement cannot "
                    "be rejected in its current state."
                ),
            )

        previous_status = (
            advertisement.status
        )

        now = datetime.now(
            UTC
        )

        advertisement.status = (
            AdvertisementStatus.REJECTED
        )

        advertisement.rejected_at = (
            now
        )

        advertisement.rejection_reason = (
            reason
        )

        advertisement.review_notes = (
            reason
        )

        advertisement.reviewed_by_user_id = (
            admin.id
        )

        advertisement.approved_at = None
        advertisement.starts_at = None
        advertisement.ends_at = None
        advertisement.completed_at = None

        self.audit.add(
            action=(
                "advertisement.rejected"
            ),
            actor_user_id=admin.id,
            target_type="advertisement",
            target_id=str(
                advertisement.id
            ),
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status_code=200,
            details={
                "reference": (
                    advertisement.reference
                ),
                "previous_status": (
                    previous_status.value
                ),
                "new_status": (
                    AdvertisementStatus
                    .REJECTED
                    .value
                ),
                "reason": reason,
            },
        )

        await self.session.commit()

        return await self.get_advertisement(
            advertisement.id
        )

    async def cancel(
        self,
        *,
        admin: User,
        advertisement_id: UUID,
        reason: str,
        request_id: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Advertisement:
        advertisement = (
            await self._get_for_update(
                advertisement_id
            )
        )

        if advertisement.status in {
            AdvertisementStatus
            .COMPLETED,
            AdvertisementStatus
            .CANCELLED,
            AdvertisementStatus
            .REFUNDED,
        }:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This advertisement cannot "
                    "be cancelled in its current state."
                ),
            )

        previous_status = (
            advertisement.status
        )

        advertisement.status = (
            AdvertisementStatus.CANCELLED
        )

        advertisement.review_notes = (
            reason
        )

        advertisement.reviewed_by_user_id = (
            admin.id
        )

        self.audit.add(
            action=(
                "advertisement.cancelled"
            ),
            actor_user_id=admin.id,
            target_type="advertisement",
            target_id=str(
                advertisement.id
            ),
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status_code=200,
            details={
                "reference": (
                    advertisement.reference
                ),
                "previous_status": (
                    previous_status.value
                ),
                "new_status": (
                    AdvertisementStatus
                    .CANCELLED
                    .value
                ),
                "reason": reason,
            },
        )

        await self.session.commit()

        return await self.get_advertisement(
            advertisement.id
        )

    async def activate_scheduled(
        self,
        *,
        now: datetime | None = None,
        limit: int = 100,
    ) -> int:
        """
        Move due scheduled campaigns to live.
        """

        if now is None:
            now = datetime.now(
                UTC
            )

        result = await self.session.scalars(
            select(
                Advertisement
            )
            .where(
                Advertisement.status
                == AdvertisementStatus
                .SCHEDULED,
                Advertisement.starts_at
                .is_not(None),
                Advertisement.starts_at
                <= now,
                Advertisement.ends_at
                .is_not(None),
                Advertisement.ends_at
                > now,
            )
            .order_by(
                Advertisement.starts_at
                .asc()
            )
            .limit(
                limit
            )
            .with_for_update(
                skip_locked=True
            )
        )

        advertisements = list(
            result.all()
        )

        for advertisement in advertisements:
            advertisement.status = (
                AdvertisementStatus.LIVE
            )

        await self.session.flush()

        return len(
            advertisements
        )

    async def complete_expired(
        self,
        *,
        now: datetime | None = None,
        limit: int = 100,
    ) -> int:
        """
        Complete live or scheduled campaigns whose end time has
        passed.
        """

        if now is None:
            now = datetime.now(
                UTC
            )

        result = await self.session.scalars(
            select(
                Advertisement
            )
            .where(
                Advertisement.status.in_(
                    [
                        AdvertisementStatus
                        .LIVE,
                        AdvertisementStatus
                        .SCHEDULED,
                    ]
                ),
                Advertisement.ends_at
                .is_not(None),
                Advertisement.ends_at
                <= now,
            )
            .order_by(
                Advertisement.ends_at
                .asc()
            )
            .limit(
                limit
            )
            .with_for_update(
                skip_locked=True
            )
        )

        advertisements = list(
            result.all()
        )

        for advertisement in advertisements:
            advertisement.status = (
                AdvertisementStatus
                .COMPLETED
            )

            advertisement.completed_at = (
                now
            )

        await self.session.flush()

        return len(
            advertisements
        )

    async def _get_for_update(
        self,
        advertisement_id: UUID,
    ) -> Advertisement:
        advertisement = (
            await self.session.scalar(
                select(
                    Advertisement
                )
                .where(
                    Advertisement.id
                    == advertisement_id
                )
                .with_for_update()
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

    async def _require_successful_payment(
        self,
        advertisement: Advertisement,
    ) -> None:
        successful_payment_id = (
            await self.session.scalar(
                select(
                    AdvertisementPayment.id
                )
                .where(
                    AdvertisementPayment.advertisement_id
                    == advertisement.id,
                    AdvertisementPayment.status
                    == PaymentStatus.SUCCESS,
                )
                .limit(1)
            )
        )

        if successful_payment_id is None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This advertisement has no "
                    "verified successful payment."
                ),
            )