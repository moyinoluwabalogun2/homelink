from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    CompoundTokenError,
    compound_token_matches,
    create_access_token,
    create_compound_token,
    hash_compound_token,
    hash_password,
    parse_compound_token,
    password_needs_rehash,
    verify_password,
)
from app.models.auth_session import AuthSession
from app.models.enums import AccountStatus
from app.models.user import User
from app.repositories.auth_session_repository import AuthSessionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import ChangePasswordRequest, LoginRequest, RegisterRequest


settings = get_settings()


class AuthServiceError(Exception):
    pass


class DuplicateAccountError(AuthServiceError):
    pass


class InvalidCredentialsError(AuthServiceError):
    pass


class AccountUnavailableError(AuthServiceError):
    pass


class InvalidRefreshTokenError(AuthServiceError):
    pass


class PasswordResetRequiredError(AuthServiceError):
    pass


class InvalidCurrentPasswordError(AuthServiceError):
    pass


class AccountLockedError(AuthServiceError):
    def __init__(self, retry_after: int) -> None:
        super().__init__(
            "Sign-in is temporarily unavailable. Try again later or reset your password."
        )
        self.retry_after = max(1, retry_after)


@dataclass
class AuthResult:
    user: User
    access_token: str
    refresh_token: str


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.auth_sessions = AuthSessionRepository(session)

    async def register(
        self,
        payload: RegisterRequest,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthResult:
        if await self.users.get_by_email(str(payload.email)) is not None:
            raise DuplicateAccountError("An account already exists with these details.")
        if await self.users.get_by_phone(payload.phone) is not None:
            raise DuplicateAccountError("An account already exists with these details.")

        now = datetime.now(UTC)
        user = User(
            full_name=payload.full_name,
            email=str(payload.email),
            phone=payload.phone,
            password_hash=hash_password(payload.password),
            status=AccountStatus.ACTIVE,
            auth_version=1,
            password_changed_at=now,
            terms_accepted_at=now,
            privacy_notice_acknowledged_at=now,
            terms_version=settings.terms_version,
            privacy_version=settings.privacy_version,
            marketing_consent=payload.marketing_consent,
        )
        self.users.add(user)

        try:
            await self.session.flush()
            result = await self._create_session(
                user=user,
                user_agent=user_agent,
                ip_address=ip_address,
            )
            await self.session.commit()
            return result
        except IntegrityError as exc:
            await self.session.rollback()
            raise DuplicateAccountError("An account already exists with these details.") from exc
        except Exception:
            await self.session.rollback()
            raise

    async def login(
        self,
        payload: LoginRequest,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthResult:
        user = await self.users.get_by_email_for_update(str(payload.email))

        if user is None:
            verify_password(payload.password, DUMMY_PASSWORD_HASH)
            raise InvalidCredentialsError("Incorrect email or password.")

        now = datetime.now(UTC)

        if user.locked_until is not None and user.locked_until > now:
            raise AccountLockedError(int((user.locked_until - now).total_seconds()))
        if user.requires_password_reset:
            raise PasswordResetRequiredError("Password reset is required before sign-in.")

        self._validate_account(user)

        if not verify_password(payload.password, user.password_hash):
            self._record_failed_login(user=user, now=now)
            await self.session.commit()

            if user.requires_password_reset:
                raise PasswordResetRequiredError("Password reset is required before sign-in.")
            if user.locked_until is not None and user.locked_until > now:
                raise AccountLockedError(int((user.locked_until - now).total_seconds()))
            raise InvalidCredentialsError("Incorrect email or password.")

        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_failed_login_at = None
        user.last_login_at = now

        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(payload.password)

        result = await self._create_session(
            user=user,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        await self.session.commit()
        return result

    async def refresh(
        self,
        refresh_token: str,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthResult:
        try:
            session_id = parse_compound_token(refresh_token)
        except CompoundTokenError as exc:
            raise InvalidRefreshTokenError("Invalid refresh token.") from exc

        auth_session = await self.auth_sessions.get_by_id(session_id)
        now = datetime.now(UTC)

        if auth_session is None:
            raise InvalidRefreshTokenError("Refresh session was not found.")
        if auth_session.revoked_at is not None:
            raise InvalidRefreshTokenError("Refresh session was revoked.")
        if auth_session.expires_at <= now:
            raise InvalidRefreshTokenError("Refresh session expired.")
        if not compound_token_matches(refresh_token, auth_session.refresh_token_hash):
            auth_session.revoked_at = now
            await self.session.commit()
            raise InvalidRefreshTokenError("Refresh-token reuse was detected.")

        user = auth_session.user
        self._validate_account(user)

        if user.requires_password_reset:
            raise PasswordResetRequiredError("Password reset is required.")

        rotated_refresh_token = create_compound_token(auth_session.id)
        auth_session.refresh_token_hash = hash_compound_token(rotated_refresh_token)
        auth_session.last_used_at = now
        if user_agent:
            auth_session.user_agent = user_agent[:500]
        if ip_address:
            auth_session.ip_address = ip_address[:45]

        access_token = create_access_token(
            user_id=user.id,
            role=user.role,
            auth_version=user.auth_version,
        )
        await self.session.commit()

        return AuthResult(
            user=user,
            access_token=access_token,
            refresh_token=rotated_refresh_token,
        )

    async def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        try:
            session_id = parse_compound_token(refresh_token)
        except CompoundTokenError:
            return

        auth_session = await self.auth_sessions.get_by_id(session_id)
        if auth_session is None:
            return
        if not compound_token_matches(refresh_token, auth_session.refresh_token_hash):
            return
        if auth_session.revoked_at is None:
            auth_session.revoked_at = datetime.now(UTC)
            await self.session.commit()

    async def logout_all(self, user: User) -> None:
        now = datetime.now(UTC)
        await self.auth_sessions.revoke_all_for_user(user_id=user.id, revoked_at=now)
        user.auth_version += 1
        await self.session.commit()

    async def change_password(
        self,
        *,
        user_id: UUID,
        payload: ChangePasswordRequest,
    ) -> None:
        user = await self.users.get_by_id_for_update(user_id)

        if user is None:
            raise AccountUnavailableError("Account is unavailable.")
        if not verify_password(payload.current_password, user.password_hash):
            raise InvalidCurrentPasswordError("Current password is incorrect.")
        if verify_password(payload.new_password, user.password_hash):
            raise InvalidCurrentPasswordError("New password must be different from the current password.")

        now = datetime.now(UTC)
        user.password_hash = hash_password(payload.new_password)
        user.password_changed_at = now
        user.auth_version += 1
        user.failed_login_attempts = 0
        user.locked_until = None
        user.requires_password_reset = False
        user.last_failed_login_at = None
        await self.auth_sessions.revoke_all_for_user(user_id=user.id, revoked_at=now)
        await self.session.commit()

    async def _create_session(
        self,
        *,
        user: User,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthResult:
        session_id = uuid4()
        refresh_token = create_compound_token(session_id)
        auth_session = AuthSession(
            id=session_id,
            user_id=user.id,
            refresh_token_hash=hash_compound_token(refresh_token),
            user_agent=user_agent[:500] if user_agent else None,
            ip_address=ip_address[:45] if ip_address else None,
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        )
        self.auth_sessions.add(auth_session)
        await self.session.flush()

        return AuthResult(
            user=user,
            access_token=create_access_token(
                user_id=user.id,
                role=user.role,
                auth_version=user.auth_version,
            ),
            refresh_token=refresh_token,
        )

    @staticmethod
    def _record_failed_login(*, user: User, now: datetime) -> None:
        user.failed_login_attempts += 1
        user.last_failed_login_at = now

        if user.failed_login_attempts >= settings.force_reset_after_failures:
            user.requires_password_reset = True
            user.locked_until = None
            user.auth_version += 1
            return

        if user.failed_login_attempts >= settings.login_max_failures:
            user.locked_until = now + timedelta(minutes=settings.login_lock_minutes)

    @staticmethod
    def _validate_account(user: User) -> None:
        if user.deleted_at is not None or user.status != AccountStatus.ACTIVE:
            raise AccountUnavailableError("Account is unavailable.")