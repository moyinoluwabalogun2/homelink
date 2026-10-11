from __future__ import annotations

from datetime import (
    UTC,
    datetime,
    timedelta,
)

from sqlalchemy import (
    case,
    func,
    select,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.models.advertising import (
    Advertisement,
    AdvertisementPayment,
)
from app.models.agent import (
    AgentProfile,
)
from app.models.enums import (
    AccountStatus,
    AdvertisementStatus,
    AgentApplicationStatus,
    ListingStatus,
    PaymentProvider,
    PaymentStatus,
)
from app.models.listing import (
    Listing,
)
from app.models.payment import (
    Payment,
)
from app.models.user import User
from app.schemas.admin_dashboard import (
    AdminAdvertisementSummary,
    AdminAgentSummary,
    AdminDashboardRead,
    AdminListingSummary,
    AdminRevenueSummary,
    AdminUserSummary,
)


class AdminDashboardService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def get_dashboard(
        self,
    ) -> AdminDashboardRead:
        generated_at = datetime.now(
            UTC
        )

        (
            user_summary,
            listing_summary,
            agent_summary,
            advertisement_summary,
            normal_payment_summary,
            advertisement_payment_summary,
        ) = (
            await self._get_user_summary(
                now=generated_at
            ),
            await self._get_listing_summary(),
            await self._get_agent_summary(),
            await self._get_advertisement_summary(),
            await self._get_payment_summary(
                Payment
            ),
            await self._get_payment_summary(
                AdvertisementPayment
            ),
        )

        revenue = self._combine_revenue(
            normal=normal_payment_summary,
            advertisement=(
                advertisement_payment_summary
            ),
        )

        return AdminDashboardRead(
            generated_at=generated_at,
            revenue=revenue,
            users=user_summary,
            listings=listing_summary,
            agents=agent_summary,
            advertisements=(
                advertisement_summary
            ),
        )

    async def _get_user_summary(
        self,
        *,
        now: datetime,
    ) -> AdminUserSummary:
        recent_cutoff = (
            now
            - timedelta(
                days=30
            )
        )

        row = (
            await self.session.execute(
                select(
                    func.count(
                        User.id
                    ).label(
                        "total"
                    ),
                    self._count_when(
                        User.status
                        == AccountStatus.ACTIVE
                    ).label(
                        "active"
                    ),
                    self._count_when(
                        User.status
                        == AccountStatus
                        .PENDING_VERIFICATION
                    ).label(
                        "pending_verification"
                    ),
                    self._count_when(
                        User.status
                        == AccountStatus
                        .SUSPENDED
                    ).label(
                        "suspended"
                    ),
                    self._count_when(
                        User.status
                        == AccountStatus
                        .DEACTIVATED
                    ).label(
                        "deactivated"
                    ),
                    self._count_when(
                        User.created_at
                        >= recent_cutoff
                    ).label(
                        "registered_last_30_days"
                    ),
                )
                .where(
                    User.deleted_at
                    .is_(None)
                )
            )
        ).mappings().one()

        return AdminUserSummary(
            total=self._integer(
                row["total"]
            ),
            active=self._integer(
                row["active"]
            ),
            pending_verification=(
                self._integer(
                    row[
                        "pending_verification"
                    ]
                )
            ),
            suspended=self._integer(
                row["suspended"]
            ),
            deactivated=self._integer(
                row["deactivated"]
            ),
            registered_last_30_days=(
                self._integer(
                    row[
                        "registered_last_30_days"
                    ]
                )
            ),
        )

    async def _get_listing_summary(
        self,
    ) -> AdminListingSummary:
        row = (
            await self.session.execute(
                select(
                    func.count(
                        Listing.id
                    ).label(
                        "total"
                    ),
                    self._count_when(
                        Listing.status
                        == ListingStatus.DRAFT
                    ).label(
                        "draft"
                    ),
                    self._count_when(
                        Listing.status
                        == ListingStatus.PENDING
                    ).label(
                        "pending"
                    ),
                    self._count_when(
                        Listing.status
                        == ListingStatus.PUBLISHED
                    ).label(
                        "published"
                    ),
                    self._count_when(
                        Listing.status
                        == ListingStatus.REJECTED
                    ).label(
                        "rejected"
                    ),
                    self._count_when(
                        Listing.status
                        == ListingStatus.EXPIRED
                    ).label(
                        "expired"
                    ),
                    self._count_when(
                        Listing.status
                        == ListingStatus.SOLD
                    ).label(
                        "sold"
                    ),
                    self._count_when(
                        Listing.status
                        == ListingStatus.RENTED
                    ).label(
                        "rented"
                    ),
                    self._count_when(
                        Listing.status
                        == ListingStatus.ARCHIVED
                    ).label(
                        "archived"
                    ),
                )
                .where(
                    Listing.deleted_at
                    .is_(None)
                )
            )
        ).mappings().one()

        return AdminListingSummary(
            total=self._integer(
                row["total"]
            ),
            draft=self._integer(
                row["draft"]
            ),
            pending=self._integer(
                row["pending"]
            ),
            published=self._integer(
                row["published"]
            ),
            rejected=self._integer(
                row["rejected"]
            ),
            expired=self._integer(
                row["expired"]
            ),
            sold=self._integer(
                row["sold"]
            ),
            rented=self._integer(
                row["rented"]
            ),
            archived=self._integer(
                row["archived"]
            ),
        )

    async def _get_agent_summary(
        self,
    ) -> AdminAgentSummary:
        row = (
            await self.session.execute(
                select(
                    func.count(
                        AgentProfile.id
                    ).label(
                        "total"
                    ),
                    self._count_when(
                        AgentProfile.status
                        == AgentApplicationStatus
                        .PENDING
                    ).label(
                        "pending"
                    ),
                    self._count_when(
                        AgentProfile.status
                        == AgentApplicationStatus
                        .APPROVED
                    ).label(
                        "approved"
                    ),
                    self._count_when(
                        AgentProfile.status
                        == AgentApplicationStatus
                        .REJECTED
                    ).label(
                        "rejected"
                    ),
                )
                .where(
                    AgentProfile.deleted_at
                    .is_(None)
                )
            )
        ).mappings().one()

        return AdminAgentSummary(
            total=self._integer(
                row["total"]
            ),
            pending=self._integer(
                row["pending"]
            ),
            approved=self._integer(
                row["approved"]
            ),
            rejected=self._integer(
                row["rejected"]
            ),
        )

    async def _get_advertisement_summary(
        self,
    ) -> AdminAdvertisementSummary:
        row = (
            await self.session.execute(
                select(
                    func.count(
                        Advertisement.id
                    ).label(
                        "total"
                    ),
                    self._count_when(
                        Advertisement.status
                        == AdvertisementStatus
                        .PAYMENT_PENDING
                    ).label(
                        "payment_pending"
                    ),
                    self._count_when(
                        Advertisement.status
                        == AdvertisementStatus
                        .PENDING_REVIEW
                    ).label(
                        "pending_review"
                    ),
                    self._count_when(
                        Advertisement.status
                        == AdvertisementStatus
                        .CHANGES_REQUESTED
                    ).label(
                        "changes_requested"
                    ),
                    self._count_when(
                        Advertisement.status
                        == AdvertisementStatus
                        .APPROVED
                    ).label(
                        "approved"
                    ),
                    self._count_when(
                        Advertisement.status
                        == AdvertisementStatus
                        .SCHEDULED
                    ).label(
                        "scheduled"
                    ),
                    self._count_when(
                        Advertisement.status
                        == AdvertisementStatus
                        .LIVE
                    ).label(
                        "live"
                    ),
                    self._count_when(
                        Advertisement.status
                        == AdvertisementStatus
                        .COMPLETED
                    ).label(
                        "completed"
                    ),
                    self._count_when(
                        Advertisement.status
                        == AdvertisementStatus
                        .REJECTED
                    ).label(
                        "rejected"
                    ),
                    self._count_when(
                        Advertisement.status
                        == AdvertisementStatus
                        .CANCELLED
                    ).label(
                        "cancelled"
                    ),
                    self._count_when(
                        Advertisement.status
                        == AdvertisementStatus
                        .REFUNDED
                    ).label(
                        "refunded"
                    ),
                    func.coalesce(
                        func.sum(
                            Advertisement
                            .impression_count
                        ),
                        0,
                    ).label(
                        "impressions"
                    ),
                    func.coalesce(
                        func.sum(
                            Advertisement
                            .click_count
                        ),
                        0,
                    ).label(
                        "clicks"
                    ),
                )
            )
        ).mappings().one()

        return AdminAdvertisementSummary(
            total=self._integer(
                row["total"]
            ),
            payment_pending=(
                self._integer(
                    row[
                        "payment_pending"
                    ]
                )
            ),
            pending_review=(
                self._integer(
                    row[
                        "pending_review"
                    ]
                )
            ),
            changes_requested=(
                self._integer(
                    row[
                        "changes_requested"
                    ]
                )
            ),
            approved=self._integer(
                row["approved"]
            ),
            scheduled=self._integer(
                row["scheduled"]
            ),
            live=self._integer(
                row["live"]
            ),
            completed=self._integer(
                row["completed"]
            ),
            rejected=self._integer(
                row["rejected"]
            ),
            cancelled=self._integer(
                row["cancelled"]
            ),
            refunded=self._integer(
                row["refunded"]
            ),
            impressions=self._integer(
                row["impressions"]
            ),
            clicks=self._integer(
                row["clicks"]
            ),
        )

    async def _get_payment_summary(
        self,
        payment_model,
    ) -> dict[str, int]:
        row = (
            await self.session.execute(
                select(
                    func.coalesce(
                        func.sum(
                            case(
                                (
                                    payment_model.status
                                    == PaymentStatus.SUCCESS,
                                    payment_model.amount_kobo,
                                ),
                                else_=0,
                            )
                        ),
                        0,
                    ).label(
                        "successful_revenue"
                    ),
                    func.coalesce(
                        func.sum(
                            case(
                                (
                                    (
                                        payment_model.status
                                        == PaymentStatus.SUCCESS
                                    )
                                    & (
                                        payment_model.provider
                                        == PaymentProvider.PAYSTACK
                                    ),
                                    payment_model.amount_kobo,
                                ),
                                else_=0,
                            )
                        ),
                        0,
                    ).label(
                        "paystack_revenue"
                    ),
                    func.coalesce(
                        func.sum(
                            case(
                                (
                                    (
                                        payment_model.status
                                        == PaymentStatus.SUCCESS
                                    )
                                    & (
                                        payment_model.provider
                                        == PaymentProvider.FLUTTERWAVE
                                    ),
                                    payment_model.amount_kobo,
                                ),
                                else_=0,
                            )
                        ),
                        0,
                    ).label(
                        "flutterwave_revenue"
                    ),
                    func.coalesce(
                        func.sum(
                            case(
                                (
                                    (
                                        payment_model.status
                                        == PaymentStatus.SUCCESS
                                    )
                                    & (
                                        payment_model.provider
                                        == PaymentProvider.MOCK
                                    ),
                                    payment_model.amount_kobo,
                                ),
                                else_=0,
                            )
                        ),
                        0,
                    ).label(
                        "mock_revenue"
                    ),
                    self._count_when(
                        payment_model.status
                        == PaymentStatus.SUCCESS
                    ).label(
                        "successful"
                    ),
                    self._count_when(
                        payment_model.status
                        == PaymentStatus.PENDING
                    ).label(
                        "pending"
                    ),
                    self._count_when(
                        payment_model.status
                        == PaymentStatus.FAILED
                    ).label(
                        "failed"
                    ),
                    self._count_when(
                        payment_model.status
                        == PaymentStatus.ABANDONED
                    ).label(
                        "abandoned"
                    ),
                    self._count_when(
                        payment_model.status
                        == PaymentStatus.REFUNDED
                    ).label(
                        "refunded"
                    ),
                )
            )
        ).mappings().one()

        return {
            key: self._integer(
                value
            )
            for key, value
            in row.items()
        }

    def _combine_revenue(
        self,
        *,
        normal: dict[str, int],
        advertisement: dict[str, int],
    ) -> AdminRevenueSummary:
        listing_credit_kobo = normal[
            "successful_revenue"
        ]

        advertisement_kobo = advertisement[
            "successful_revenue"
        ]

        return AdminRevenueSummary(
            total_kobo=(
                listing_credit_kobo
                + advertisement_kobo
            ),
            listing_credit_kobo=(
                listing_credit_kobo
            ),
            advertisement_kobo=(
                advertisement_kobo
            ),
            paystack_kobo=(
                normal[
                    "paystack_revenue"
                ]
                + advertisement[
                    "paystack_revenue"
                ]
            ),
            flutterwave_kobo=(
                normal[
                    "flutterwave_revenue"
                ]
                + advertisement[
                    "flutterwave_revenue"
                ]
            ),
            mock_kobo=(
                normal[
                    "mock_revenue"
                ]
                + advertisement[
                    "mock_revenue"
                ]
            ),
            successful_transactions=(
                normal["successful"]
                + advertisement[
                    "successful"
                ]
            ),
            pending_transactions=(
                normal["pending"]
                + advertisement[
                    "pending"
                ]
            ),
            failed_transactions=(
                normal["failed"]
                + advertisement[
                    "failed"
                ]
            ),
            abandoned_transactions=(
                normal["abandoned"]
                + advertisement[
                    "abandoned"
                ]
            ),
            refunded_transactions=(
                normal["refunded"]
                + advertisement[
                    "refunded"
                ]
            ),
        )

    @staticmethod
    def _count_when(
        condition,
    ):
        return func.coalesce(
            func.sum(
                case(
                    (
                        condition,
                        1,
                    ),
                    else_=0,
                )
            ),
            0,
        )

    @staticmethod
    def _integer(
        value,
    ) -> int:
        return int(
            value or 0
        )