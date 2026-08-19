from sqlalchemy import (
    and_,
    func,
    or_,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentProfile
from app.models.engagement import (
    Inquiry,
    ListingReport,
    SavedListing,
)
from app.models.enums import (
    AgentApplicationStatus,
    ListingStatus,
    PaymentStatus,
    ReportStatus,
)
from app.models.listing import Listing
from app.models.notification import Notification
from app.models.payment import Payment
from app.models.user import User

from app.schemas.dashboard import (
    AdminDashboardSummary,
    UserDashboardSummary,
)
from app.schemas.payment import CreditBalanceRead

from app.services.credit_service import CreditService


class DashboardService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    # ============================================================
    # USER DASHBOARD
    # ============================================================

    async def user_summary(
        self,
        user: User,
    ) -> UserDashboardSummary:
        """
        Dashboard summary counts are intentionally collected in
        ONE SQL statement.

        This avoids doing several sequential database round trips
        every time the dashboard shell loads.
        """

        saved_count = (
            select(func.count())
            .select_from(SavedListing)
            .where(
                SavedListing.user_id
                == user.id
            )
            .scalar_subquery()
        )

        sent_count = (
            select(func.count())
            .select_from(Inquiry)
            .where(
                Inquiry.sender_id
                == user.id
            )
            .scalar_subquery()
        )

        received_count = (
            select(func.count())
            .select_from(Inquiry)
            .where(
                Inquiry.recipient_id
                == user.id
            )
            .scalar_subquery()
        )

        unread_notification_count = (
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.user_id
                == user.id,
                Notification.read_at.is_(
                    None
                ),
            )
            .scalar_subquery()
        )

        # --------------------------------------------------------
        # UNREAD MESSAGES
        #
        # No message-table scan is needed.
        #
        # Each Inquiry stores:
        # - latest message sender/time
        # - sender read cursor
        # - recipient read cursor
        #
        # So unread state can be calculated directly from the
        # conversation row.
        # --------------------------------------------------------

        unread_sent_conversations = (
            select(func.count())
            .select_from(Inquiry)
            .where(
                Inquiry.sender_id
                == user.id,
                Inquiry.last_message_sender_id
                != user.id,
                or_(
                    Inquiry.sender_last_read_at.is_(
                        None
                    ),
                    Inquiry.sender_last_read_at
                    < Inquiry.last_message_at,
                ),
            )
            .scalar_subquery()
        )

        unread_received_conversations = (
            select(func.count())
            .select_from(Inquiry)
            .where(
                Inquiry.recipient_id
                == user.id,
                Inquiry.last_message_sender_id
                != user.id,
                or_(
                    Inquiry.recipient_last_read_at.is_(
                        None
                    ),
                    Inquiry.recipient_last_read_at
                    < Inquiry.last_message_at,
                ),
            )
            .scalar_subquery()
        )

        counts_result = (
            await self.session.execute(
                select(
                    saved_count.label(
                        "saved"
                    ),
                    sent_count.label(
                        "sent"
                    ),
                    received_count.label(
                        "received"
                    ),
                    unread_notification_count.label(
                        "unread_notifications"
                    ),
                    unread_sent_conversations.label(
                        "unread_sent"
                    ),
                    unread_received_conversations.label(
                        "unread_received"
                    ),
                )
            )
        )

        counts = (
            counts_result.mappings().one()
        )

        unread_messages = int(
            counts["unread_sent"] or 0
        ) + int(
            counts["unread_received"] or 0
        )

        # --------------------------------------------------------
        # LISTING STATUS COUNTS
        # --------------------------------------------------------

        status_rows = (
            await self.session.execute(
                select(
                    Listing.status,
                    func.count(
                        Listing.id
                    ),
                )
                .where(
                    Listing.owner_id
                    == user.id,
                    Listing.deleted_at.is_(
                        None
                    ),
                )
                .group_by(
                    Listing.status
                )
            )
        )

        listings_by_status = {
            status.value: int(
                count
            )
            for status, count
            in status_rows.all()
        }

        # --------------------------------------------------------
        # CREDITS
        #
        # CreditService read path no longer uses FOR UPDATE.
        # --------------------------------------------------------

        balances = await CreditService(
            self.session
        ).list_balances(
            user.id
        )

        await self.session.commit()

        return UserDashboardSummary(
            saved_listings=int(
                counts["saved"] or 0
            ),
            sent_inquiries=int(
                counts["sent"] or 0
            ),
            received_inquiries=int(
                counts["received"] or 0
            ),
            unread_notifications=int(
                counts[
                    "unread_notifications"
                ]
                or 0
            ),
            unread_messages=
                unread_messages,
            listings_by_status=
                listings_by_status,
            credits=[
                CreditBalanceRead.model_validate(
                    item
                )
                for item in balances
            ],
        )

    # ============================================================
    # ADMIN DASHBOARD
    # ============================================================

    async def admin_summary(
        self,
    ) -> AdminDashboardSummary:
        """
        Admin counts are also consolidated into one statement.
        """

        users_count = (
            select(func.count())
            .select_from(User)
            .scalar_subquery()
        )

        pending_agents_count = (
            select(func.count())
            .select_from(
                AgentProfile
            )
            .where(
                AgentProfile.status
                == AgentApplicationStatus.PENDING,
                AgentProfile.deleted_at.is_(
                    None
                ),
            )
            .scalar_subquery()
        )

        pending_listings_count = (
            select(func.count())
            .select_from(Listing)
            .where(
                Listing.status
                == ListingStatus.PENDING,
                Listing.deleted_at.is_(
                    None
                ),
            )
            .scalar_subquery()
        )

        open_reports_count = (
            select(func.count())
            .select_from(
                ListingReport
            )
            .where(
                ListingReport.status.in_(
                    [
                        ReportStatus.OPEN,
                        ReportStatus.IN_REVIEW,
                    ]
                )
            )
            .scalar_subquery()
        )

        successful_payments_count = (
            select(func.count())
            .select_from(Payment)
            .where(
                Payment.status
                == PaymentStatus.SUCCESS
            )
            .scalar_subquery()
        )

        successful_payment_value = (
            select(
                func.coalesce(
                    func.sum(
                        Payment.amount_kobo
                    ),
                    0,
                )
            )
            .where(
                Payment.status
                == PaymentStatus.SUCCESS
            )
            .scalar_subquery()
        )

        result = (
            await self.session.execute(
                select(
                    users_count.label(
                        "users"
                    ),
                    pending_agents_count.label(
                        "pending_agents"
                    ),
                    pending_listings_count.label(
                        "pending_listings"
                    ),
                    open_reports_count.label(
                        "open_reports"
                    ),
                    successful_payments_count.label(
                        "successful_payments"
                    ),
                    successful_payment_value.label(
                        "payment_value"
                    ),
                )
            )
        )

        row = result.mappings().one()

        return AdminDashboardSummary(
            users=int(
                row["users"] or 0
            ),
            pending_agent_applications=int(
                row[
                    "pending_agents"
                ]
                or 0
            ),
            pending_listings=int(
                row[
                    "pending_listings"
                ]
                or 0
            ),
            open_reports=int(
                row[
                    "open_reports"
                ]
                or 0
            ),
            successful_payments=int(
                row[
                    "successful_payments"
                ]
                or 0
            ),
            successful_payment_value_kobo=int(
                row[
                    "payment_value"
                ]
                or 0
            ),
        )