import asyncio
import logging
from datetime import (
    UTC,
    datetime,
    timedelta,
)

import cloudinary
import cloudinary.api
from sqlalchemy import (
    delete,
    or_,
    select,
    update,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.core.config import (
    get_settings,
)
from app.models.agent import (
    AgentVerificationDocument,
)
from app.models.audit import (
    AuditLog,
)
from app.models.auth_session import (
    AuthSession,
)
from app.models.email_verification import (
    EmailVerificationToken,
)
from app.models.enums import (
    ListingStatus,
    VerificationDocumentStatus,
)
from app.models.listing import (
    Listing,
)
from app.models.notification import (
    Notification,
)
from app.models.password_reset import (
    PasswordResetToken,
)
from app.models.payment import (
    PaymentWebhookEvent,
)
from app.services.admin_advertising_service import (
    AdminAdvertisingService,
)
from app.services.media_cleanup_service import (
    MediaCleanupService,
)


settings = get_settings()
logger = logging.getLogger(
    __name__
)


class MaintenanceService:
    MEDIA_CLEANUP_BATCHES_PER_RUN = 3

    ADVERTISEMENT_BATCH_SIZE = 100

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

        self.media_cleanup = (
            MediaCleanupService(
                session
            )
        )

        self.advertising = (
            AdminAdvertisingService(
                session
            )
        )

    async def run(
        self,
    ) -> dict[str, int]:
        now = datetime.now(
            UTC
        )

        # One indexed UPDATE instead of loading every expired
        # listing into Python.
        expired_result = (
            await self.session.execute(
                update(
                    Listing
                )
                .where(
                    Listing.status
                    == ListingStatus
                    .PUBLISHED,
                    Listing.expires_at
                    .is_not(None),
                    Listing.expires_at
                    <= now,
                    Listing.deleted_at
                    .is_(None),
                )
                .values(
                    status=(
                        ListingStatus
                        .EXPIRED
                    ),
                )
            )
        )

        # Complete expired advert campaigns first. This includes
        # any scheduled campaign whose entire date range passed
        # before a maintenance run could activate it.
        completed_advertisements = (
            await self.advertising
            .complete_expired(
                now=now,
                limit=(
                    self
                    .ADVERTISEMENT_BATCH_SIZE
                ),
            )
        )

        # Activate only campaigns that are due and whose end date
        # remains in the future.
        activated_advertisements = (
            await self.advertising
            .activate_scheduled(
                now=now,
                limit=(
                    self
                    .ADVERTISEMENT_BATCH_SIZE
                ),
            )
        )

        session_cutoff = (
            now
            - timedelta(
                days=(
                    settings
                    .session_cleanup_grace_days
                ),
            )
        )

        deleted_sessions = (
            await self.session.execute(
                delete(
                    AuthSession
                ).where(
                    AuthSession.expires_at
                    < session_cutoff,
                )
            )
        )

        token_cutoff = (
            now
            - timedelta(
                days=(
                    settings
                    .token_cleanup_retention_days
                ),
            )
        )

        deleted_password_tokens = (
            await self.session.execute(
                delete(
                    PasswordResetToken
                ).where(
                    or_(
                        PasswordResetToken
                        .expires_at
                        < token_cutoff,
                        PasswordResetToken
                        .used_at
                        < token_cutoff,
                    )
                )
            )
        )

        deleted_email_tokens = (
            await self.session.execute(
                delete(
                    EmailVerificationToken
                ).where(
                    or_(
                        EmailVerificationToken
                        .expires_at
                        < token_cutoff,
                        EmailVerificationToken
                        .used_at
                        < token_cutoff,
                    )
                )
            )
        )

        notification_cutoff = (
            now
            - timedelta(
                days=(
                    settings
                    .read_notification_retention_days
                ),
            )
        )

        deleted_notifications = (
            await self.session.execute(
                delete(
                    Notification
                ).where(
                    Notification.read_at
                    .is_not(None),
                    Notification.read_at
                    < notification_cutoff,
                )
            )
        )

        webhook_cutoff = (
            now
            - timedelta(
                days=(
                    settings
                    .webhook_event_retention_days
                ),
            )
        )

        deleted_webhooks = (
            await self.session.execute(
                delete(
                    PaymentWebhookEvent
                ).where(
                    PaymentWebhookEvent
                    .processed_at
                    .is_not(None),
                    PaymentWebhookEvent
                    .processed_at
                    < webhook_cutoff,
                )
            )
        )

        audit_cutoff = (
            now
            - timedelta(
                days=(
                    settings
                    .audit_log_retention_days
                ),
            )
        )

        deleted_audits = (
            await self.session.execute(
                delete(
                    AuditLog
                ).where(
                    AuditLog.created_at
                    < audit_cutoff,
                )
            )
        )

        # Queue a maximum of 300 expired listing-media assets.
        queued_listing_media = (
            await self.media_cleanup
            .enqueue_expired_listing_media(
                now=now,
            )
        )

        # Process at most three Cloudinary batches during this
        # maintenance run. This prevents cleanup from dominating
        # normal user traffic.
        purged_listing_media = 0

        for _ in range(
            self.MEDIA_CLEANUP_BATCHES_PER_RUN
        ):
            processed = (
                await self.media_cleanup
                .process_pending_jobs(
                    now=now,
                )
            )

            purged_listing_media += (
                processed
            )

            if processed == 0:
                break

        purged_agent_documents = (
            await self._purge_agent_documents(
                now=now,
            )
        )

        # One transaction covers database maintenance and advert
        # lifecycle transitions.
        await self.session.commit()

        return {
            "expired_listings": int(
                expired_result.rowcount
                or 0
            ),
            "activated_advertisements": (
                activated_advertisements
            ),
            "completed_advertisements": (
                completed_advertisements
            ),
            "deleted_sessions": int(
                deleted_sessions.rowcount
                or 0
            ),
            "deleted_password_reset_tokens": int(
                deleted_password_tokens
                .rowcount
                or 0
            ),
            "deleted_email_verification_tokens": int(
                deleted_email_tokens
                .rowcount
                or 0
            ),
            "deleted_notifications": int(
                deleted_notifications
                .rowcount
                or 0
            ),
            "deleted_webhook_events": int(
                deleted_webhooks.rowcount
                or 0
            ),
            "deleted_audit_logs": int(
                deleted_audits.rowcount
                or 0
            ),
            "queued_listing_media": (
                queued_listing_media
            ),
            "purged_listing_media": (
                purged_listing_media
            ),
            "purged_agent_verification_documents": (
                purged_agent_documents
            ),
        }

    async def _purge_agent_documents(
        self,
        *,
        now: datetime,
    ) -> int:
        if (
            not settings.cloudinary_enabled
            or not (
                settings
                .cloudinary_cloud_name
            )
            or not (
                settings
                .cloudinary_api_key
            )
            or not (
                settings
                .cloudinary_api_secret
            )
        ):
            return 0

        cutoff = (
            now
            - timedelta(
                days=(
                    settings
                    .agent_document_retention_days
                ),
            )
        )

        result = await self.session.execute(
            select(
                AgentVerificationDocument.id,
                AgentVerificationDocument
                .storage_public_id,
            )
            .where(
                AgentVerificationDocument
                .status
                .in_(
                    [
                        VerificationDocumentStatus
                        .APPROVED,
                        VerificationDocumentStatus
                        .REJECTED,
                    ]
                ),
                AgentVerificationDocument
                .reviewed_at
                .is_not(None),
                AgentVerificationDocument
                .reviewed_at
                <= cutoff,
                AgentVerificationDocument
                .purged_at
                .is_(None),
                AgentVerificationDocument
                .storage_public_id
                .is_not(None),
                AgentVerificationDocument
                .storage_resource_type
                == "image",
                AgentVerificationDocument
                .storage_delivery_type
                == "authenticated",
            )
            .order_by(
                AgentVerificationDocument
                .reviewed_at
                .asc(),
                AgentVerificationDocument
                .id
                .asc(),
            )
            .limit(
                100
            )
        )

        rows = list(
            result.mappings().all()
        )

        if not rows:
            return 0

        document_ids_by_public_id: dict[
            str,
            list,
        ] = {}

        for row in rows:
            public_id = row[
                "storage_public_id"
            ]

            if not isinstance(
                public_id,
                str,
            ):
                continue

            document_ids_by_public_id.setdefault(
                public_id,
                [],
            ).append(
                row["id"]
            )

        public_ids = list(
            document_ids_by_public_id
        )

        if not public_ids:
            return 0

        cloudinary.config(
            cloud_name=(
                settings
                .cloudinary_cloud_name
            ),
            api_key=(
                settings
                .cloudinary_api_key
            ),
            api_secret=(
                settings
                .cloudinary_api_secret
            ),
            secure=True,
        )

        try:
            response = await asyncio.to_thread(
                cloudinary.api
                .delete_resources,
                public_ids,
                resource_type="image",
                type="authenticated",
                invalidate=True,
            )

        except Exception:
            logger.exception(
                "Agent verification document "
                "retention cleanup failed."
            )

            return 0

        if not isinstance(
            response,
            dict,
        ):
            logger.warning(
                "Cloudinary returned an "
                "unexpected document deletion "
                "response."
            )

            return 0

        deleted_map = response.get(
            "deleted",
            {},
        )

        if not isinstance(
            deleted_map,
            dict,
        ):
            return 0

        removed_public_ids = [
            public_id
            for public_id, status
            in deleted_map.items()
            if status in {
                "deleted",
                "not_found",
            }
        ]

        database_ids = []

        for public_id in (
            removed_public_ids
        ):
            database_ids.extend(
                document_ids_by_public_id
                .get(
                    public_id,
                    [],
                )
            )

        if not database_ids:
            return 0

        update_result = (
            await self.session.execute(
                update(
                    AgentVerificationDocument
                )
                .where(
                    AgentVerificationDocument
                    .id
                    .in_(
                        database_ids
                    )
                )
                .values(
                    file_url=None,
                    purged_at=now,
                )
            )
        )

        return int(
            update_result.rowcount
            or 0
        )