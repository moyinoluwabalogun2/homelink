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
    hash_password,
    parse_compound_token,
)
from app.models.enums import AccountStatus
from app.models.password_reset import PasswordResetToken
from app.repositories.auth_session_repository import AuthSessionRepository
from app.repositories.user_repository import UserRepository
from app.services.email_service import EmailService


settings = get_settings()


class PasswordResetError(Exception):
    pass


class PasswordResetService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.auth_sessions = AuthSessionRepository(session)
        self.email_service = EmailService()

    async def request_reset(
        self,
        *,
        email: str,
        requested_ip: str | None,
    ) -> None:
        user = await self.users.get_by_email(email)

        if user is None or user.deleted_at is not None or user.status != AccountStatus.ACTIVE:
            return

        now = datetime.now(UTC)
        await self.session.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=now)
        )

        token_id = uuid4()
        raw_token = create_compound_token(token_id)
        self.session.add(
            PasswordResetToken(
                id=token_id,
                user_id=user.id,
                token_hash=hash_compound_token(raw_token),
                expires_at=now + timedelta(minutes=settings.password_reset_expire_minutes),
                requested_ip=requested_ip[:45] if requested_ip else None,
            )
        )
        await self.session.commit()
        await self.email_service.send_password_reset(
            recipient_email=user.email,
            recipient_name=user.full_name,
            raw_token=raw_token,
        )

    async def reset_password(
        self,
        *,
        raw_token: str,
        new_password: str,
    ) -> None:
        try:
            token_id = parse_compound_token(raw_token)
        except CompoundTokenError as exc:
            raise PasswordResetError("Reset link is invalid or expired.") from exc

        token = await self.session.scalar(
            select(PasswordResetToken)
            .options(joinedload(PasswordResetToken.user))
            .where(PasswordResetToken.id == token_id)
            .with_for_update()
        )
        now = datetime.now(UTC)

        if (
            token is None
            or token.used_at is not None
            or token.expires_at <= now
            or not compound_token_matches(raw_token, token.token_hash)
        ):
            raise PasswordResetError("Reset link is invalid or expired.")

        user = token.user
        if user.deleted_at is not None or user.status != AccountStatus.ACTIVE:
            raise PasswordResetError("Account is unavailable.")

        user.password_hash = hash_password(new_password)
        user.password_changed_at = now
        user.auth_version += 1
        user.failed_login_attempts = 0
        user.locked_until = None
        user.requires_password_reset = False
        user.last_failed_login_at = None
        token.used_at = now

        await self.session.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.id != token.id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=now)
        )
        await self.auth_sessions.revoke_all_for_user(user_id=user.id, revoked_at=now)
        await self.session.commit()