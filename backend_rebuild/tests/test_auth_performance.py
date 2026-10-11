import asyncio
from datetime import UTC, datetime, timedelta
from inspect import iscoroutinefunction, signature
from uuid import uuid4

from sqlalchemy.dialects import postgresql

from app.api.v1.endpoints.auth import build_auth_response
from app.core.security import hash_password
from app.models.enums import AccountStatus, UserRole
from app.models.user import User
from app.repositories.auth_session_repository import (
    AuthSessionRepository,
)
from app.schemas.auth import LoginRequest
from app.services.auth_service import (
    AuthResult,
    AuthService,
)


def _user(
    *,
    password_hash: str = "unused",
    updated_at: datetime | None = None,
) -> User:
    now = datetime.now(
        UTC
    )

    return User(
        id=uuid4(),
        full_name="Test User",
        email="test@example.com",
        phone="+2348000000000",
        password_hash=password_hash,
        role=UserRole.USER,
        status=AccountStatus.ACTIVE,
        is_email_verified=True,
        is_phone_verified=False,
        profile_image_url=None,
        auth_version=1,
        failed_login_attempts=0,
        locked_until=None,
        requires_password_reset=False,
        last_failed_login_at=None,
        last_login_at=None,
        password_changed_at=now,
        terms_accepted_at=now,
        privacy_notice_acknowledged_at=now,
        terms_version="test",
        privacy_version="test",
        marketing_consent=False,
        anonymized_at=None,
        created_at=now,
        updated_at=(
            updated_at
            or now
        ),
        deleted_at=None,
    )


def test_auth_response_does_not_require_a_database_session(
) -> None:
    user = _user()

    result = AuthResult(
        user=user,
        access_token="access",
        refresh_token="refresh",
    )

    assert not iscoroutinefunction(
        build_auth_response
    )

    assert list(
        signature(
            build_auth_response
        ).parameters
    ) == [
        "result"
    ]

    response = build_auth_response(
        result
    )

    assert (
        response.user.id
        == user.id
    )

    assert (
        response.user.updated_at
        == user.updated_at
    )


def test_refresh_lookup_uses_one_inner_join_and_locks_only_session(
) -> None:
    class CaptureSession:
        statement = None

        async def scalar(
            self,
            statement,
        ):
            self.statement = statement
            return None

    session = CaptureSession()

    asyncio.run(
        AuthSessionRepository(
            session
        ).get_by_id(
            uuid4()
        )
    )

    assert (
        session.statement
        is not None
    )

    sql = str(
        session.statement.compile(
            dialect=(
                postgresql.dialect()
            ),
            compile_kwargs={
                "literal_binds": True,
            },
        )
    )

    normalized = " ".join(
        sql.split()
    )

    assert (
        " JOIN users "
        in normalized
    )

    assert (
        "LEFT OUTER JOIN users"
        not in normalized
    )

    assert (
        "FOR UPDATE OF auth_sessions"
        in normalized
    )


def test_login_keeps_updated_at_loaded_for_response_serialization(
) -> None:
    class FakeSession:
        def __init__(
            self,
        ) -> None:
            self.commits = 0
            self.flushes = 0

        def add(
            self,
            _value,
        ) -> None:
            return None

        async def flush(
            self,
        ) -> None:
            self.flushes += 1

        async def commit(
            self,
        ) -> None:
            self.commits += 1

        async def rollback(
            self,
        ) -> None:
            return None

    class FakeUsers:
        def __init__(
            self,
            user: User,
        ) -> None:
            self.user = user

        async def get_by_email_for_update(
            self,
            _email: str,
        ) -> User:
            return self.user

    password = "StrongPass123!"

    old_updated_at = (
        datetime.now(
            UTC
        )
        - timedelta(
            days=1
        )
    )

    user = _user(
        password_hash=hash_password(
            password
        ),
        updated_at=old_updated_at,
    )

    session = FakeSession()

    service = AuthService(
        session
    )

    service.users = FakeUsers(
        user
    )

    result = asyncio.run(
        service.login(
            LoginRequest(
                email=user.email,
                password=password,
            ),
            user_agent="test",
            ip_address="127.0.0.1",
        )
    )

    assert (
        session.flushes
        == 1
    )

    assert (
        session.commits
        == 1
    )

    assert (
        user.updated_at
        > old_updated_at
    )

    assert (
        build_auth_response(
            result
        ).user.updated_at
        == user.updated_at
    )