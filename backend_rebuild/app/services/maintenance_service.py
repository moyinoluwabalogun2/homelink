import asyncio
import logging
from datetime import UTC, datetime, timedelta

import cloudinary
import cloudinary.api
from sqlalchemy import (
    delete,
    or_,
    select,
    update,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.agent import (
    AgentVerificationDocument,
)
from app.models.audit import AuditLog
from app.models.auth_session import AuthSession
from app.models.email_verification import (
    EmailVerificationToken,
)
from app.models.enums import (
    ListingStatus,
    VerificationDocumentStatus,
)
from app.models.listing import Listing
from app.models.notification import Notification
from app.models.password_reset import (
    PasswordResetToken,
)
from app.models.payment import (
    PaymentWebhookEvent,
)


settings = get_settings()

logger = logging.getLogger(
    __name__
)


class MaintenanceService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def run(
        self,
    ) -> dict[str, int]:
        now = datetime.now(
            UTC
        )

        # ========================================================
        # EXPIRE LISTINGS
        # ========================================================

        expired_result = (
            await self.session.execute(
                update(Listing)
                .where(
                    Listing.status
                    == ListingStatus.PUBLISHED,
                    Listing.expires_at.is_not(
                        None
                    ),
                    Listing.expires_at
                    <= now,
                    Listing.deleted_at.is_(
                        None
                    ),
                )
                .values(
                    status=(
                        ListingStatus.EXPIRED
                    )
                )
            )
        )

        # ========================================================
        # AUTH SESSIONS
        # ========================================================

        session_cutoff = (
            now
            - timedelta(
                days=(
                    settings.session_cleanup_grace_days
                )
            )
        )

        deleted_sessions = (
            await self.session.execute(
                delete(
                    AuthSession
                ).where(
                    AuthSession.expires_at
                    < session_cutoff
                )
            )
        )

        # ========================================================
        # AUTH TOKENS
        # ========================================================

        token_cutoff = (
            now
            - timedelta(
                days=(
                    settings.token_cleanup_retention_days
                )
            )
        )

        deleted_password_tokens = (
            await self.session.execute(
                delete(
                    PasswordResetToken
                ).where(
                    or_(
                        PasswordResetToken.expires_at
                        < token_cutoff,

                        PasswordResetToken.used_at
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
                        EmailVerificationToken.expires_at
                        < token_cutoff,

                        EmailVerificationToken.used_at
                        < token_cutoff,
                    )
                )
            )
        )

        # ========================================================
        # READ NOTIFICATIONS
        # ========================================================

        notification_cutoff = (
            now
            - timedelta(
                days=(
                    settings.read_notification_retention_days
                )
            )
        )

        deleted_notifications = (
            await self.session.execute(
                delete(
                    Notification
                ).where(
                    Notification.read_at.is_not(
                        None
                    ),
                    Notification.read_at
                    < notification_cutoff,
                )
            )
        )

        # ========================================================
        # PAYMENT WEBHOOK HISTORY
        # ========================================================

        webhook_cutoff = (
            now
            - timedelta(
                days=(
                    settings.webhook_event_retention_days
                )
            )
        )

        deleted_webhooks = (
            await self.session.execute(
                delete(
                    PaymentWebhookEvent
                ).where(
                    PaymentWebhookEvent.processed_at.is_not(
                        None
                    ),
                    PaymentWebhookEvent.processed_at
                    < webhook_cutoff,
                )
            )
        )

        # ========================================================
        # AUDIT LOGS
        # ========================================================

        audit_cutoff = (
            now
            - timedelta(
                days=(
                    settings.audit_log_retention_days
                )
            )
        )

        deleted_audits = (
            await self.session.execute(
                delete(
                    AuditLog
                ).where(
                    AuditLog.created_at
                    < audit_cutoff
                )
            )
        )

        # ========================================================
        # AGENT VERIFICATION DOCUMENTS
        #
        # Pending:
        #   NEVER purged.
        #
        # Approved/rejected:
        #   Cloudinary file is removed after the configured
        #   retention period.
        #
        # PostgreSQL row remains for audit history.
        # ========================================================

        purged_agent_documents = (
            await self._purge_agent_documents(
                now=now
            )
        )

        await self.session.commit()

        return {
            "expired_listings": int(
                expired_result.rowcount
                or 0
            ),

            "deleted_sessions": int(
                deleted_sessions.rowcount
                or 0
            ),

            "deleted_password_reset_tokens": int(
                deleted_password_tokens.rowcount
                or 0
            ),

            "deleted_email_verification_tokens": int(
                deleted_email_tokens.rowcount
                or 0
            ),

            "deleted_notifications": int(
                deleted_notifications.rowcount
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

            "purged_agent_verification_documents": (
                purged_agent_documents
            ),
        }

    # ============================================================
    # AGENT DOCUMENT RETENTION
    # ============================================================

    async def _purge_agent_documents(
        self,
        *,
        now: datetime,
    ) -> int:
        if (
            not settings.cloudinary_enabled
            or not settings.cloudinary_cloud_name
            or not settings.cloudinary_api_key
            or not settings.cloudinary_api_secret
        ):
            return 0

        cutoff = (
            now
            - timedelta(
                days=(
                    settings.agent_document_retention_days
                )
            )
        )

        # --------------------------------------------------------
        # BOUNDED BATCH
        #
        # We deliberately process only 100 files in one
        # maintenance run.
        #
        # No table-wide hydration and no one-request-per-file
        # Cloudinary loop.
        # --------------------------------------------------------

        result = await self.session.execute(
            select(
                AgentVerificationDocument.id,
                AgentVerificationDocument.storage_public_id,
            )
            .where(
                AgentVerificationDocument.status.in_(
                    [
                        VerificationDocumentStatus.APPROVED,
                        VerificationDocumentStatus.REJECTED,
                    ]
                ),

                AgentVerificationDocument.reviewed_at.is_not(
                    None
                ),

                AgentVerificationDocument.reviewed_at
                <= cutoff,

                AgentVerificationDocument.purged_at.is_(
                    None
                ),

                AgentVerificationDocument.storage_public_id.is_not(
                    None
                ),

                AgentVerificationDocument.storage_resource_type
                == "image",

                AgentVerificationDocument.storage_delivery_type
                == "authenticated",
            )
            .order_by(
                AgentVerificationDocument.reviewed_at.asc(),
                AgentVerificationDocument.id.asc(),
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

        # Public ID -> DB document IDs.
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
            document_ids_by_public_id.keys()
        )

        if not public_ids:
            return 0

        # --------------------------------------------------------
        # CLOUDINARY ADMIN API
        #
        # Python Cloudinary SDK is synchronous, so run the
        # network call off the async FastAPI event loop.
        # --------------------------------------------------------

        cloudinary.config(
            cloud_name=(
                settings.cloudinary_cloud_name
            ),
            api_key=(
                settings.cloudinary_api_key
            ),
            api_secret=(
                settings.cloudinary_api_secret
            ),
            secure=True,
        )

        try:
            response = await asyncio.to_thread(
                cloudinary.api.delete_resources,
                public_ids,
                resource_type="image",
                type="authenticated",
                invalidate=True,
            )

        except Exception:
            # Cloudinary being temporarily unavailable must not
            # prevent the unrelated maintenance tasks above from
            # committing.
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
                "Cloudinary returned an unexpected "
                "agent document deletion response."
            )

            return 0

        deleted_map = response.get(
            "deleted",
            {}
        )

        if not isinstance(
            deleted_map,
            dict,
        ):
            return 0

        successfully_removed_public_ids = [
            public_id
            for (
                public_id,
                status,
            )
            in deleted_map.items()
            if status
            in {
                "deleted",
                "not_found",
            }
        ]

        if not successfully_removed_public_ids:
            return 0

        database_ids = []

        for public_id in (
            successfully_removed_public_ids
        ):
            database_ids.extend(
                document_ids_by_public_id.get(
                    public_id,
                    [],
                )
            )

        if not database_ids:
            return 0

        # --------------------------------------------------------
        # KEEP AUDIT ROW, REMOVE THE ACTUAL FILE REFERENCE
        #
        # We intentionally retain:
        # - document type
        # - verification result
        # - rejection reason
        # - reviewed timestamp
        # - Cloudinary public ID metadata
        #
        # But the usable file URL disappears.
        # --------------------------------------------------------

        update_result = (
            await self.session.execute(
                update(
                    AgentVerificationDocument
                )
                .where(
                    AgentVerificationDocument.id.in_(
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