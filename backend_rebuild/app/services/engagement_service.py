import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import (
    case,
    delete,
    or_,
    select,
    update,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.core.redis import publish_user_event
from app.models.engagement import (
    Inquiry,
    InquiryMessage,
    ListingReport,
    SavedListing,
)
from app.models.enums import (
    InquiryStatus,
    ListingStatus,
    NotificationType,
    ReportStatus,
    UserRole,
)
from app.models.listing import Listing
from app.models.user import User
from app.schemas.engagement import (
    InquiryCreate,
    InquiryInboxItemRead,
    InquiryListingSummaryRead,
    InquiryMessageCreate,
    InquiryMessageRead,
    InquiryParticipantRead,
    InquiryThreadRead,
    ListingReportCreate,
    ListingReportResolve,
)
from app.services.notification_service import NotificationService


logger = logging.getLogger(__name__)


class EngagementService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session
        self.notifications = NotificationService(
            session
        )

    # ============================================================
    # SAVED LISTINGS
    # ============================================================

    async def save_listing(
        self,
        *,
        user: User,
        listing_id: UUID,
    ) -> SavedListing:
        listing = await self._get_published_listing(
            listing_id
        )

        existing = await self.session.scalar(
            select(SavedListing).where(
                SavedListing.user_id == user.id,
                SavedListing.listing_id == listing.id,
            )
        )

        if existing is not None:
            return existing

        saved = SavedListing(
            user_id=user.id,
            listing_id=listing.id,
        )

        self.session.add(saved)

        await self.session.commit()

        reloaded = await self.session.scalar(
            select(SavedListing).where(
                SavedListing.user_id == user.id,
                SavedListing.listing_id == listing.id,
            )
        )

        if reloaded is None:
            raise RuntimeError(
                "Saved listing disappeared after save."
            )

        return reloaded

    async def remove_saved_listing(
        self,
        *,
        user: User,
        listing_id: UUID,
    ) -> None:
        await self.session.execute(
            delete(SavedListing).where(
                SavedListing.user_id == user.id,
                SavedListing.listing_id == listing_id,
            )
        )

        await self.session.commit()

    async def list_saved(
        self,
        user: User,
    ) -> list[SavedListing]:
        result = await self.session.scalars(
            select(SavedListing)
            .options(
                selectinload(
                    SavedListing.listing
                )
            )
            .join(
                SavedListing.listing
            )
            .where(
                SavedListing.user_id == user.id,
                Listing.status == ListingStatus.PUBLISHED,
                Listing.deleted_at.is_(None),
            )
            .order_by(
                SavedListing.created_at.desc()
            )
        )

        return list(
            result.unique().all()
        )

    # ============================================================
    # CREATE INQUIRY / START CONVERSATION
    # ============================================================

    async def create_inquiry(
        self,
        *,
        user: User,
        listing_id: UUID,
        payload: InquiryCreate,
    ) -> Inquiry:
        """
        Start a conversation from a published listing.

        Only the columns needed to create the inquiry are loaded,
        avoiding heavyweight Listing relationships.
        """

        listing_row = (
            await self.session.execute(
                select(
                    Listing.id,
                    Listing.owner_id,
                    Listing.title,
                ).where(
                    Listing.id == listing_id,
                    Listing.status == ListingStatus.PUBLISHED,
                    Listing.deleted_at.is_(None),
                )
            )
        ).mappings().first()

        if listing_row is None:
            raise HTTPException(
                status_code=404,
                detail="Published listing not found.",
            )

        if listing_row["owner_id"] == user.id:
            raise HTTPException(
                status_code=409,
                detail="You cannot inquire about your own listing.",
            )

        now = datetime.now(UTC)
        message_text = payload.message.strip()

        inquiry = Inquiry(
            listing_id=listing_row["id"],
            sender_id=user.id,
            recipient_id=listing_row["owner_id"],
            inquiry_type=payload.inquiry_type,
            message=message_text,
            status=InquiryStatus.OPEN,
            last_message_at=now,
            last_message_preview=message_text[:240],
            last_message_sender_id=user.id,
            sender_last_read_at=now,
            recipient_last_read_at=None,
        )

        self.session.add(inquiry)

        # Needed so inquiry.id exists before creating its first message.
        await self.session.flush()

        first_message = InquiryMessage(
            inquiry_id=inquiry.id,
            sender_id=user.id,
            message=message_text,
        )

        self.session.add(first_message)

        # Atomic counter update without loading the entire listing.
        await self.session.execute(
            update(Listing)
            .where(
                Listing.id == listing_row["id"]
            )
            .values(
                contact_count=Listing.contact_count + 1
            )
        )

        self.notifications.create(
            user_id=listing_row["owner_id"],
            notification_type=NotificationType.NEW_INQUIRY,
            title="New listing inquiry",
            message=(
                f'You received a new inquiry about '
                f'"{listing_row["title"]}".'
            ),
            data={
                "listing_id": str(
                    listing_row["id"]
                ),
                "inquiry_id": str(
                    inquiry.id
                ),
            },
        )

        await self.session.commit()

        return await self._get_inquiry(
            inquiry.id
        )

    # ============================================================
    # MESSAGE INBOX
    # ============================================================

    async def list_inbox(
        self,
        *,
        user: User,
        limit: int = 50,
        before: datetime | None = None,
    ) -> list[InquiryInboxItemRead]:
        """
        One lightweight query for sent + received conversations.

        No message-table scan.
        No full Listing hydration.
        No full User hydration.
        """

        limit = max(
            1,
            min(limit, 100),
        )

        OtherUser = aliased(
            User,
            name="other_user",
        )

        other_user_id = case(
            (
                Inquiry.sender_id == user.id,
                Inquiry.recipient_id,
            ),
            else_=Inquiry.sender_id,
        )

        statement = (
            select(
                Inquiry.id.label(
                    "inquiry_id"
                ),
                Inquiry.sender_id,
                Inquiry.recipient_id,
                Inquiry.inquiry_type,
                Inquiry.status,
                Inquiry.last_message_preview,
                Inquiry.last_message_at,
                Inquiry.last_message_sender_id,
                Inquiry.sender_last_read_at,
                Inquiry.recipient_last_read_at,
                Inquiry.created_at,
                Listing.id.label(
                    "listing_id"
                ),
                Listing.listing_type,
                Listing.title.label(
                    "listing_title"
                ),
                Listing.slug.label(
                    "listing_slug"
                ),
                OtherUser.id.label(
                    "other_user_id"
                ),
                OtherUser.full_name.label(
                    "other_user_full_name"
                ),
                OtherUser.role.label(
                    "other_user_role"
                ),
                OtherUser.profile_image_url.label(
                    "other_user_profile_image_url"
                ),
            )
            .join(
                Listing,
                Listing.id == Inquiry.listing_id,
            )
            .join(
                OtherUser,
                OtherUser.id == other_user_id,
            )
            .where(
                or_(
                    Inquiry.sender_id == user.id,
                    Inquiry.recipient_id == user.id,
                )
            )
        )

        if before is not None:
            statement = statement.where(
                Inquiry.last_message_at < before
            )

        statement = statement.order_by(
            Inquiry.last_message_at.desc(),
            Inquiry.id.desc(),
        ).limit(limit)

        result = await self.session.execute(
            statement
        )

        items: list[
            InquiryInboxItemRead
        ] = []

        for row in result.mappings():
            current_user_is_sender = (
                row["sender_id"] == user.id
            )

            read_at = (
                row["sender_last_read_at"]
                if current_user_is_sender
                else row["recipient_last_read_at"]
            )

            unread = (
                row["last_message_sender_id"] != user.id
                and (
                    read_at is None
                    or read_at < row["last_message_at"]
                )
            )

            items.append(
                InquiryInboxItemRead(
                    id=row["inquiry_id"],
                    listing=InquiryListingSummaryRead(
                        id=row["listing_id"],
                        listing_type=row["listing_type"],
                        title=row["listing_title"],
                        slug=row["listing_slug"],
                    ),
                    other_user=InquiryParticipantRead(
                        id=row["other_user_id"],
                        full_name=row["other_user_full_name"],
                        role=row["other_user_role"],
                        profile_image_url=row[
                            "other_user_profile_image_url"
                        ],
                    ),
                    inquiry_type=row["inquiry_type"],
                    status=row["status"],
                    last_message_preview=row[
                        "last_message_preview"
                    ],
                    last_message_at=row[
                        "last_message_at"
                    ],
                    last_message_sender_id=row[
                        "last_message_sender_id"
                    ],
                    unread=unread,
                    created_at=row["created_at"],
                )
            )

        return items

    # ============================================================
    # LOAD ONE CONVERSATION
    # ============================================================

    async def get_thread(
        self,
        *,
        user: User,
        inquiry_id: UUID,
        limit: int = 50,
        before: datetime | None = None,
    ) -> InquiryThreadRead:
        """
        Bounded conversation loading:

        1 query for conversation metadata.
        1 query for at most limit + 1 messages.
        """

        limit = max(
            1,
            min(limit, 100),
        )

        Sender = aliased(
            User,
            name="inquiry_sender",
        )

        Recipient = aliased(
            User,
            name="inquiry_recipient",
        )

        statement = (
            select(
                Inquiry.id.label(
                    "inquiry_id"
                ),
                Inquiry.sender_id,
                Inquiry.recipient_id,
                Inquiry.inquiry_type,
                Inquiry.status,
                Inquiry.responded_at,
                Inquiry.closed_at,
                Inquiry.created_at,
                Listing.id.label(
                    "listing_id"
                ),
                Listing.listing_type,
                Listing.title.label(
                    "listing_title"
                ),
                Listing.slug.label(
                    "listing_slug"
                ),
                Sender.id.label(
                    "sender_user_id"
                ),
                Sender.full_name.label(
                    "sender_full_name"
                ),
                Sender.role.label(
                    "sender_role"
                ),
                Sender.profile_image_url.label(
                    "sender_profile_image_url"
                ),
                Recipient.id.label(
                    "recipient_user_id"
                ),
                Recipient.full_name.label(
                    "recipient_full_name"
                ),
                Recipient.role.label(
                    "recipient_role"
                ),
                Recipient.profile_image_url.label(
                    "recipient_profile_image_url"
                ),
            )
            .join(
                Listing,
                Listing.id == Inquiry.listing_id,
            )
            .join(
                Sender,
                Sender.id == Inquiry.sender_id,
            )
            .join(
                Recipient,
                Recipient.id == Inquiry.recipient_id,
            )
            .where(
                Inquiry.id == inquiry_id
            )
        )

        if user.role != UserRole.ADMIN:
            statement = statement.where(
                or_(
                    Inquiry.sender_id == user.id,
                    Inquiry.recipient_id == user.id,
                )
            )

        header = (
            await self.session.execute(
                statement
            )
        ).mappings().first()

        if header is None:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found.",
            )

        messages_statement = (
            select(
                InquiryMessage.id,
                InquiryMessage.inquiry_id,
                InquiryMessage.sender_id,
                InquiryMessage.message,
                InquiryMessage.created_at,
                InquiryMessage.updated_at,
            )
            .where(
                InquiryMessage.inquiry_id == inquiry_id
            )
        )

        if before is not None:
            messages_statement = messages_statement.where(
                InquiryMessage.created_at < before
            )

        messages_statement = (
            messages_statement
            .order_by(
                InquiryMessage.created_at.desc(),
                InquiryMessage.id.desc(),
            )
            .limit(limit + 1)
        )

        result = await self.session.execute(
            messages_statement
        )

        rows = list(
            result.mappings().all()
        )

        has_more = len(rows) > limit

        rows = rows[:limit]

        # DB returns newest first.
        # Chat UI wants oldest -> newest.
        rows.reverse()

        messages = [
            InquiryMessageRead(
                id=row["id"],
                inquiry_id=row["inquiry_id"],
                sender_id=row["sender_id"],
                message=row["message"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in rows
        ]

        next_before = None

        if has_more and messages:
            next_before = messages[0].created_at

        return InquiryThreadRead(
            id=header["inquiry_id"],
            listing=InquiryListingSummaryRead(
                id=header["listing_id"],
                listing_type=header["listing_type"],
                title=header["listing_title"],
                slug=header["listing_slug"],
            ),
            sender=InquiryParticipantRead(
                id=header["sender_user_id"],
                full_name=header["sender_full_name"],
                role=header["sender_role"],
                profile_image_url=header[
                    "sender_profile_image_url"
                ],
            ),
            recipient=InquiryParticipantRead(
                id=header["recipient_user_id"],
                full_name=header["recipient_full_name"],
                role=header["recipient_role"],
                profile_image_url=header[
                    "recipient_profile_image_url"
                ],
            ),
            inquiry_type=header["inquiry_type"],
            status=header["status"],
            responded_at=header["responded_at"],
            closed_at=header["closed_at"],
            created_at=header["created_at"],
            messages=messages,
            has_more=has_more,
            next_before=next_before,
        )

    # ============================================================
    # SEND MESSAGE
    # ============================================================

    async def send_reply(
    self,
    *,
    user: User,
    inquiry_id: UUID,
    payload: InquiryMessageCreate,
) -> InquiryMessageRead:
        """
        Send one message while briefly locking only the Inquiry row.

        The event tells the frontend whether this message changed
        the recipient's conversation from read -> unread, so the
        global unread badge does not over-count multiple messages
        in the same unread conversation.
        """

        statement = (
            select(
                Inquiry.id,
                Inquiry.sender_id,
                Inquiry.recipient_id,
                Inquiry.listing_id,
                Inquiry.status,

                # Needed to calculate the recipient's unread state
                # BEFORE this new message changes the conversation.
                Inquiry.last_message_at,
                Inquiry.last_message_sender_id,
                Inquiry.sender_last_read_at,
                Inquiry.recipient_last_read_at,

                Listing.title.label(
                    "listing_title"
                ),
            )
            .join(
                Listing,
                Listing.id == Inquiry.listing_id,
            )
            .where(
                Inquiry.id == inquiry_id
            )
            .with_for_update(
                of=Inquiry
            )
        )

        row = (
            await self.session.execute(
                statement
            )
        ).mappings().first()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found.",
            )

        if user.id not in {
            row["sender_id"],
            row["recipient_id"],
        }:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You cannot send messages "
                    "in this conversation."
                ),
            )

        if row["status"] == InquiryStatus.CLOSED:
            raise HTTPException(
                status_code=409,
                detail="This conversation is closed.",
            )

        now = datetime.now(UTC)
        message_text = payload.message.strip()

        # --------------------------------------------------------
        # RECIPIENT + EXISTING UNREAD STATE
        # --------------------------------------------------------

        if user.id == row["sender_id"]:
            other_user_id = row["recipient_id"]

            other_user_read_at = row[
                "recipient_last_read_at"
            ]

        else:
            other_user_id = row["sender_id"]

            other_user_read_at = row[
                "sender_last_read_at"
            ]

        other_user_was_unread = (
            row["last_message_sender_id"]
            != other_user_id
            and (
                other_user_read_at is None
                or other_user_read_at
                < row["last_message_at"]
            )
        )

        # Every incoming message makes the conversation unread for
        # the recipient. But the unread-conversation COUNT should
        # increase only if it was previously read.
        became_unread = (
            not other_user_was_unread
        )

        # --------------------------------------------------------
        # CREATE MESSAGE
        # --------------------------------------------------------

        message = InquiryMessage(
            inquiry_id=inquiry_id,
            sender_id=user.id,
            message=message_text,
        )

        self.session.add(
            message
        )

        await self.session.flush()

        message_read = InquiryMessageRead(
            id=message.id,
            inquiry_id=message.inquiry_id,
            sender_id=message.sender_id,
            message=message.message,
            created_at=message.created_at,
            updated_at=message.updated_at,
        )

        # --------------------------------------------------------
        # UPDATE CONVERSATION METADATA
        # --------------------------------------------------------

        values: dict[
            str,
            object,
        ] = {
            "last_message_at":
                now,

            "last_message_preview":
                message_text[:240],

            "last_message_sender_id":
                user.id,
        }

        resulting_status = row[
            "status"
        ]

        if user.id == row["sender_id"]:
            values[
                "sender_last_read_at"
            ] = now

        else:
            values[
                "recipient_last_read_at"
            ] = now

            # Listing owner's first reply automatically changes
            # open -> responded.
            if (
                row["status"]
                == InquiryStatus.OPEN
            ):
                values[
                    "status"
                ] = InquiryStatus.RESPONDED

                values[
                    "responded_at"
                ] = now

                resulting_status = (
                    InquiryStatus.RESPONDED
                )

        await self.session.execute(
            update(Inquiry)
            .where(
                Inquiry.id
                == inquiry_id
            )
            .values(
                **values
            )
        )

        # --------------------------------------------------------
        # NOTIFICATION
        # --------------------------------------------------------

        self.notifications.create(
            user_id=other_user_id,
            notification_type=(
                NotificationType.NEW_INQUIRY
            ),
            title="New message",
            message=(
                f'You received a new message about '
                f'"{row["listing_title"]}".'
            ),
            data={
                "listing_id": str(
                    row["listing_id"]
                ),

                "inquiry_id": str(
                    inquiry_id
                ),

                "message_id": str(
                    message.id
                ),
            },
        )

        # --------------------------------------------------------
        # DATABASE FIRST
        #
        # Never publish a live event until the database transaction
        # has definitely succeeded.
        # --------------------------------------------------------

        await self.session.commit()

        # --------------------------------------------------------
        # REAL-TIME EVENT
        #
        # Redis failure does not undo or report failure for a
        # message already saved successfully.
        # --------------------------------------------------------

        try:
            await publish_user_event(
                user_id=other_user_id,
                event_type="message.created",
                data={
                    "inquiry_id": str(
                        inquiry_id
                    ),

                    "listing_id": str(
                        row["listing_id"]
                    ),

                    "listing_title":
                        row[
                            "listing_title"
                        ],

                    "status":
                        resulting_status.value,

                    # THIS is what the dashboard badge will use.
                    #
                    # True:
                    #   conversation changed read -> unread,
                    #   increment unread conversation count.
                    #
                    # False:
                    #   conversation was already unread,
                    #   do not increment again.
                    "became_unread":
                        became_unread,

                    "message": {
                        "id": str(
                            message_read.id
                        ),

                        "inquiry_id": str(
                            message_read.inquiry_id
                        ),

                        "sender_id": str(
                            message_read.sender_id
                        ),

                        "message":
                            message_read.message,

                        "created_at":
                            message_read.created_at.isoformat(),

                        "updated_at":
                            message_read.updated_at.isoformat(),
                    },
                },
            )

        except Exception:
            logger.exception(
                "Could not publish live message event "
                "for inquiry %s.",
                inquiry_id,
            )

        return message_read

    # ============================================================
    # MARK CONVERSATION READ
    # ============================================================

    async def mark_thread_read(
        self,
        *,
        user: User,
        inquiry_id: UUID,
    ) -> None:
        """
        Only one Inquiry row is updated.

        We do not UPDATE every individual message when a thread
        is read.
        """

        now = datetime.now(UTC)

        if user.role == UserRole.ADMIN:
            exists = await self.session.scalar(
                select(
                    Inquiry.id
                ).where(
                    Inquiry.id == inquiry_id
                )
            )

            if exists is None:
                raise HTTPException(
                    status_code=404,
                    detail="Conversation not found.",
                )

            return

        result = await self.session.execute(
            update(Inquiry)
            .where(
                Inquiry.id == inquiry_id,
                or_(
                    Inquiry.sender_id == user.id,
                    Inquiry.recipient_id == user.id,
                ),
            )
            .values(
                sender_last_read_at=case(
                    (
                        Inquiry.sender_id == user.id,
                        now,
                    ),
                    else_=Inquiry.sender_last_read_at,
                ),
                recipient_last_read_at=case(
                    (
                        Inquiry.recipient_id == user.id,
                        now,
                    ),
                    else_=Inquiry.recipient_last_read_at,
                ),
            )
            .returning(
                Inquiry.id
            )
        )

        updated_id = result.scalar_one_or_none()

        if updated_id is None:
            await self.session.rollback()

            raise HTTPException(
                status_code=404,
                detail="Conversation not found.",
            )

        await self.session.commit()

    # ============================================================
    # LEGACY SENT / RECEIVED
    # ============================================================

    async def list_sent(
        self,
        user: User,
    ) -> list[Inquiry]:
        return await self._list_inquiries(
            Inquiry.sender_id == user.id
        )

    async def list_received(
        self,
        user: User,
    ) -> list[Inquiry]:
        return await self._list_inquiries(
            Inquiry.recipient_id == user.id
        )

    # ============================================================
    # STATUS
    # ============================================================

    async def update_inquiry_status(
        self,
        *,
        user: User,
        inquiry_id: UUID,
        status: InquiryStatus,
    ) -> Inquiry:
        inquiry = await self._get_inquiry(
            inquiry_id,
            for_update=True,
        )

        if (
            user.id not in {
                inquiry.sender_id,
                inquiry.recipient_id,
            }
            and user.role != UserRole.ADMIN
        ):
            raise HTTPException(
                status_code=403,
                detail="You cannot update this inquiry.",
            )

        if (
            status == InquiryStatus.RESPONDED
            and user.id != inquiry.recipient_id
            and user.role != UserRole.ADMIN
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Only the listing owner can mark "
                    "an inquiry as responded."
                ),
            )

        now = datetime.now(UTC)

        inquiry.status = status

        if status == InquiryStatus.RESPONDED:
            inquiry.responded_at = now
            inquiry.closed_at = None

        elif status == InquiryStatus.CLOSED:
            inquiry.closed_at = now

        elif status == InquiryStatus.OPEN:
            inquiry.closed_at = None

        await self.session.commit()

        return await self._get_inquiry(
            inquiry.id
        )

    # ============================================================
    # REPORTS
    # ============================================================

    async def create_report(
        self,
        *,
        user: User,
        listing_id: UUID,
        payload: ListingReportCreate,
    ) -> ListingReport:
        listing = await self._get_published_listing(
            listing_id
        )

        if listing.owner_id == user.id:
            raise HTTPException(
                status_code=409,
                detail="You cannot report your own listing.",
            )

        report = ListingReport(
            listing_id=listing.id,
            reporter_id=user.id,
            reason=payload.reason,
            details=(
                payload.details.strip()
                if payload.details
                else None
            ),
            status=ReportStatus.OPEN,
        )

        self.session.add(report)

        try:
            await self.session.commit()

        except IntegrityError as exc:
            await self.session.rollback()

            raise HTTPException(
                status_code=409,
                detail=(
                    "You have already reported this listing."
                ),
            ) from exc

        return await self._get_report(
            report.id
        )

    async def list_my_reports(
        self,
        user: User,
    ) -> list[ListingReport]:
        result = await self.session.scalars(
            select(
                ListingReport
            )
            .where(
                ListingReport.reporter_id == user.id
            )
            .order_by(
                ListingReport.created_at.desc()
            )
        )

        return list(
            result.unique().all()
        )

    async def list_admin_reports(
        self,
        status: ReportStatus | None,
    ) -> list[ListingReport]:
        statement = select(
            ListingReport
        )

        if status is not None:
            statement = statement.where(
                ListingReport.status == status
            )

        result = await self.session.scalars(
            statement.order_by(
                ListingReport.created_at.asc()
            )
        )

        return list(
            result.unique().all()
        )

    async def resolve_report(
        self,
        *,
        admin: User,
        report_id: UUID,
        payload: ListingReportResolve,
    ) -> ListingReport:
        if payload.status not in {
            ReportStatus.RESOLVED,
            ReportStatus.DISMISSED,
        }:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Admin resolution status must "
                    "be resolved or dismissed."
                ),
            )

        report = await self._get_report(
            report_id,
            for_update=True,
        )

        report.status = payload.status

        report.resolution_note = (
            payload.resolution_note.strip()
        )

        report.reviewed_by_id = admin.id

        report.reviewed_at = datetime.now(UTC)

        self.notifications.create(
            user_id=report.reporter_id,
            notification_type=NotificationType.REPORT_RESOLVED,
            title="Listing report reviewed",
            message=(
                "An administrator reviewed "
                "your listing report."
            ),
            data={
                "report_id": str(
                    report.id
                ),
                "status": report.status.value,
            },
        )

        await self.session.commit()

        return await self._get_report(
            report.id
        )

    # ============================================================
    # INTERNAL HELPERS
    # ============================================================

    async def _get_published_listing(
        self,
        listing_id: UUID,
    ) -> Listing:
        listing = await self.session.scalar(
            select(Listing).where(
                Listing.id == listing_id,
                Listing.status == ListingStatus.PUBLISHED,
                Listing.deleted_at.is_(None),
            )
        )

        if listing is None:
            raise HTTPException(
                status_code=404,
                detail="Published listing not found.",
            )

        return listing

    async def _get_inquiry(
        self,
        inquiry_id: UUID,
        for_update: bool = False,
    ) -> Inquiry:
        statement = select(
            Inquiry
        ).where(
            Inquiry.id == inquiry_id
        )

        if for_update:
            statement = statement.with_for_update(
                of=Inquiry
            )

        inquiry = await self.session.scalar(
            statement
        )

        if inquiry is None:
            raise HTTPException(
                status_code=404,
                detail="Inquiry not found.",
            )

        return inquiry

    async def _list_inquiries(
        self,
        condition,
    ) -> list[Inquiry]:
        result = await self.session.scalars(
            select(Inquiry)
            .where(
                condition
            )
            .order_by(
                Inquiry.created_at.desc()
            )
        )

        return list(
            result.unique().all()
        )

    async def _get_report(
        self,
        report_id: UUID,
        for_update: bool = False,
    ) -> ListingReport:
        statement = select(
            ListingReport
        ).where(
            ListingReport.id == report_id
        )

        if for_update:
            statement = statement.with_for_update(
                of=ListingReport
            )

        report = await self.session.scalar(
            statement
        )

        if report is None:
            raise HTTPException(
                status_code=404,
                detail="Report not found.",
            )

        return report