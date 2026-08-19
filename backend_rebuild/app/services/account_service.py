from datetime import UTC, datetime
from decimal import Decimal
import secrets
from typing import Any
from uuid import UUID

from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.agent import AgentProfile, AgentVerificationDocument
from app.models.auth_session import AuthSession
from app.models.email_verification import EmailVerificationToken
from app.models.engagement import Inquiry, ListingReport, SavedListing
from app.models.enums import (
    AccountStatus,
    AgentApplicationStatus,
    ListingStatus,
    UserRole,
)
from app.models.listing import Listing
from app.models.notification import Notification
from app.models.password_reset import PasswordResetToken
from app.models.payment import Payment
from app.models.user import User
from app.repositories.auth_session_repository import AuthSessionRepository
from app.services.audit_service import AuditService


class AccountConfirmationError(Exception):
    pass


def _encode(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if hasattr(value, "value"):
        return value.value
    if isinstance(value, UUID):
        return str(value)
    return value


def _mapping_list(rows: list[Any]) -> list[dict[str, Any]]:
    return [
        {key: _encode(value) for key, value in dict(row).items()}
        for row in rows
    ]


class AccountService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def confirm_password(user: User, current_password: str) -> None:
        if not verify_password(current_password, user.password_hash):
            raise AccountConfirmationError("Current password is incorrect.")

    async def export_data(
        self,
        *,
        user: User,
        current_password: str,
    ) -> dict[str, Any]:
        self.confirm_password(user, current_password)

        listings = (
            await self.session.execute(
                select(
                    Listing.id,
                    Listing.listing_type,
                    Listing.title,
                    Listing.description,
                    Listing.price,
                    Listing.currency,
                    Listing.status,
                    Listing.published_at,
                    Listing.expires_at,
                    Listing.created_at,
                    Listing.updated_at,
                ).where(Listing.owner_id == user.id)
            )
        ).mappings().all()

        saved = (
            await self.session.execute(
                select(
                    SavedListing.listing_id,
                    SavedListing.created_at,
                ).where(SavedListing.user_id == user.id)
            )
        ).mappings().all()

        inquiries = (
            await self.session.execute(
                select(
                    Inquiry.id,
                    Inquiry.listing_id,
                    Inquiry.sender_id,
                    Inquiry.recipient_id,
                    Inquiry.inquiry_type,
                    Inquiry.message,
                    Inquiry.status,
                    Inquiry.responded_at,
                    Inquiry.closed_at,
                    Inquiry.created_at,
                ).where(
                    or_(
                        Inquiry.sender_id == user.id,
                        Inquiry.recipient_id == user.id,
                    )
                )
            )
        ).mappings().all()

        reports = (
            await self.session.execute(
                select(
                    ListingReport.id,
                    ListingReport.listing_id,
                    ListingReport.reason,
                    ListingReport.details,
                    ListingReport.status,
                    ListingReport.resolution_note,
                    ListingReport.reviewed_at,
                    ListingReport.created_at,
                ).where(ListingReport.reporter_id == user.id)
            )
        ).mappings().all()

        payments = (
            await self.session.execute(
                select(
                    Payment.id,
                    Payment.plan_id,
                    Payment.reference,
                    Payment.provider,
                    Payment.status,
                    Payment.amount_kobo,
                    Payment.currency,
                    Payment.paid_at,
                    Payment.created_at,
                ).where(Payment.user_id == user.id)
            )
        ).mappings().all()

        notifications = (
            await self.session.execute(
                select(
                    Notification.id,
                    Notification.notification_type,
                    Notification.title,
                    Notification.message,
                    Notification.data,
                    Notification.read_at,
                    Notification.created_at,
                ).where(Notification.user_id == user.id)
            )
        ).mappings().all()

        sessions = (
            await self.session.execute(
                select(
                    AuthSession.id,
                    AuthSession.user_agent,
                    AuthSession.ip_address,
                    AuthSession.expires_at,
                    AuthSession.last_used_at,
                    AuthSession.revoked_at,
                    AuthSession.created_at,
                ).where(AuthSession.user_id == user.id)
            )
        ).mappings().all()

        profile = await self.session.scalar(
            select(AgentProfile).where(AgentProfile.user_id == user.id)
        )
        agent_data: dict[str, Any] | None = None
        if profile is not None:
            documents = (
                await self.session.execute(
                    select(
                        AgentVerificationDocument.document_type,
                        AgentVerificationDocument.file_url,
                        AgentVerificationDocument.status,
                        AgentVerificationDocument.rejection_reason,
                        AgentVerificationDocument.created_at,
                    ).where(
                        AgentVerificationDocument.agent_profile_id == profile.id
                    )
                )
            ).mappings().all()
            agent_data = {
                "id": str(profile.id),
                "agent_type": _encode(profile.agent_type),
                "business_name": profile.business_name,
                "bio": profile.bio,
                "years_experience": profile.years_experience,
                "status": _encode(profile.status),
                "rejection_reason": profile.rejection_reason,
                "submitted_at": _encode(profile.submitted_at),
                "approved_at": _encode(profile.approved_at),
                "documents": _mapping_list(list(documents)),
            }

        return {
            "generated_at": datetime.now(UTC).isoformat(),
            "account": {
                "id": str(user.id),
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "role": _encode(user.role),
                "status": _encode(user.status),
                "is_email_verified": user.is_email_verified,
                "email_verified_at": _encode(user.email_verified_at),
                "is_phone_verified": user.is_phone_verified,
                "marketing_consent": user.marketing_consent,
                "terms_accepted_at": _encode(user.terms_accepted_at),
                "privacy_notice_acknowledged_at": _encode(
                    user.privacy_notice_acknowledged_at
                ),
                "terms_version": user.terms_version,
                "privacy_version": user.privacy_version,
                "created_at": _encode(user.created_at),
                "updated_at": _encode(user.updated_at),
            },
            "agent_profile": agent_data,
            "listings": _mapping_list(list(listings)),
            "saved_listings": _mapping_list(list(saved)),
            "inquiries": _mapping_list(list(inquiries)),
            "reports": _mapping_list(list(reports)),
            "payments": _mapping_list(list(payments)),
            "notifications": _mapping_list(list(notifications)),
            "sessions": _mapping_list(list(sessions)),
        }

    async def anonymize_account(
        self,
        *,
        user: User,
        current_password: str,
    ) -> None:
        self.confirm_password(user, current_password)
        now = datetime.now(UTC)

        await AuthSessionRepository(self.session).revoke_all_for_user(
            user_id=user.id,
            revoked_at=now,
        )
        await self.session.execute(
            update(Listing)
            .where(Listing.owner_id == user.id)
            .values(
                status=ListingStatus.ARCHIVED,
                deleted_at=now,
            )
        )
        await self.session.execute(
            delete(SavedListing).where(SavedListing.user_id == user.id)
        )
        await self.session.execute(
            delete(Notification).where(Notification.user_id == user.id)
        )
        await self.session.execute(
            delete(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id
            )
        )
        await self.session.execute(
            delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
        )
        await self.session.execute(
            update(AgentProfile)
            .where(AgentProfile.user_id == user.id)
            .values(
                status=AgentApplicationStatus.REJECTED,
                rejection_reason="Account deleted by user.",
                deleted_at=now,
            )
        )

        AuditService(self.session).add(
            action="account.anonymized",
            actor_user_id=user.id,
            target_type="user",
            target_id=str(user.id),
            details={"requested_at": now.isoformat()},
        )

        replacement = user.id.hex
        user.full_name = "Deleted User"
        user.email = f"deleted+{replacement}@homelink.invalid"
        user.phone = f"deleted-{replacement[:20]}"
        user.password_hash = hash_password(secrets.token_urlsafe(48))
        user.profile_image_url = None
        user.role = UserRole.USER
        user.status = AccountStatus.DEACTIVATED
        user.is_email_verified = False
        user.email_verified_at = None
        user.is_phone_verified = False
        user.marketing_consent = False
        user.terms_version = None
        user.privacy_version = None
        user.locked_until = None
        user.requires_password_reset = False
        user.failed_login_attempts = 0
        user.auth_version += 1
        user.deleted_at = now
        user.anonymized_at = now

        await self.session.commit()