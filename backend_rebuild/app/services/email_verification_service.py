from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import get_settings
from app.core.security import (
    CompoundTokenError,
    compound_token_matches,
    create_compound_token,
    hash_compound_token,
    parse_compound_token,
)
from app.models.email_verification import EmailVerificationToken
from app.models.enums import AccountStatus
from app.models.user import User
from app.services.email_service import EmailService


settings = get_settings()


class EmailVerificationError(Exception):
    pass


class EmailVerificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.email_service = EmailService()

    async def request_for_user(
        self,
        *,
        user: User,
        requested_ip: str | None,
    ) -> bool:
        if user.is_email_verified:
            return False

        now = datetime.now(UTC)
        await self.session.execute(
            update(EmailVerificationToken)
            .where(
                EmailVerificationToken.user_id == user.id,
                EmailVerificationToken.used_at.is_(None),
            )
            .values(used_at=now)
        )

        token_id = uuid4()
        raw_token = create_compound_token(token_id)

        self.session.add(
            EmailVerificationToken(
                id=token_id,
                user_id=user.id,
                token_hash=hash_compound_token(raw_token),
                expires_at=now
                + timedelta(minutes=settings.email_verification_expire_minutes),
                requested_ip=requested_ip[:45] if requested_ip else None,
            )
        )
        await self.session.commit()

        await self.email_service.send_email_verification(
            recipient_email=user.email,
            recipient_name=user.full_name,
            raw_token=raw_token,
        )
        return True

    async def confirm(self, *, raw_token: str) -> User:
        try:
            token_id = parse_compound_token(raw_token)
        except CompoundTokenError as exc:
            raise EmailVerificationError(
                "Verification link is invalid or expired."
            ) from exc

        token = await self.session.scalar(
            select(EmailVerificationToken)
            .options(joinedload(EmailVerificationToken.user))
            .where(EmailVerificationToken.id == token_id)
            .with_for_update()
        )

        now = datetime.now(UTC)
        if (
            token is None
            or token.used_at is not None
            or token.expires_at <= now
            or not compound_token_matches(raw_token, token.token_hash)
        ):
            raise EmailVerificationError(
                "Verification link is invalid or expired."
            )

        user = token.user
        if user.deleted_at is not None or user.status == AccountStatus.DEACTIVATED:
            raise EmailVerificationError("Account is unavailable.")

        user.is_email_verified = True
        user.email_verified_at = now
        if user.status == AccountStatus.PENDING_VERIFICATION:
            user.status = AccountStatus.ACTIVE
        token.used_at = now

        await self.session.execute(
            update(EmailVerificationToken)
            .where(
                EmailVerificationToken.user_id == user.id,
                EmailVerificationToken.id != token.id,
                EmailVerificationToken.used_at.is_(None),
            )
            .values(used_at=now)
        )
        await self.session.commit()
        return user