from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.dependencies import DbSession
from app.core.config import get_settings
from app.core.security import AccessTokenError, decode_access_token
from app.models.enums import AccountStatus, UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository


settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user_base(
    session: DbSession,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> User:
    authentication_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials are invalid or missing.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise authentication_error

    try:
        token_data = decode_access_token(credentials.credentials)
    except AccessTokenError as exc:
        raise authentication_error from exc

    user = await UserRepository(session).get_by_id(token_data.user_id)

    if user is None or user.deleted_at is not None:
        raise authentication_error
    if user.status != AccountStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="This account is not active.")
    if user.requires_password_reset:
        raise HTTPException(status_code=423, detail="Password reset is required.")
    if user.auth_version != token_data.auth_version or user.role != token_data.role:
        raise authentication_error

    return user


CurrentUserUnverifiedAllowed = Annotated[
    User,
    Depends(get_current_user_base),
]


async def get_current_user(
    user: CurrentUserUnverifiedAllowed,
) -> User:
    if settings.email_verification_required and not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification is required.",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*allowed_roles: UserRole) -> Callable[..., User]:
    async def role_dependency(current_user: CurrentUser) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return role_dependency