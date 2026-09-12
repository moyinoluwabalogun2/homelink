from fastapi import (
    APIRouter,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_dependencies import CurrentUser
from app.api.dependencies import DbSession, RedisClient
from app.core.config import get_settings
from app.core.rate_limit import (
    RateLimitExceeded,
    RateLimiterUnavailable,
    enforce_rate_limit,
    fingerprint,
    get_client_ip,
)
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.schemas.user import UserRead
from app.services.auth_service import (
    AccountLockedError,
    AccountUnavailableError,
    AuthResult,
    AuthService,
    DuplicateAccountError,
    InvalidCredentialsError,
    InvalidCurrentPasswordError,
    InvalidRefreshTokenError,
    PasswordResetRequiredError,
)
from app.services.password_reset_service import (
    PasswordResetError,
    PasswordResetService,
)


router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
)

settings = get_settings()


# ============================================================
# CLIENT METADATA
# ============================================================

def get_client_metadata(
    request: Request,
) -> tuple[str | None, str]:
    return (
        request.headers.get(
            "user-agent"
        ),
        get_client_ip(
            request
        ),
    )


# ============================================================
# RATE LIMITING
# ============================================================

async def apply_limit(
    redis: RedisClient,
    *,
    key: str,
    limit: int,
    window_seconds: int,
) -> None:
    try:
        await enforce_rate_limit(
            redis,
            key=key,
            limit=limit,
            window_seconds=window_seconds,
        )

    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_429_TOO_MANY_REQUESTS
            ),
            detail=(
                "Too many requests. "
                "Please try again later."
            ),
            headers={
                "Retry-After":
                    str(
                        exc.retry_after
                    ),
            },
        ) from exc

    except RateLimiterUnavailable as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "Authentication protection "
                "is temporarily unavailable."
            ),
        ) from exc


# ============================================================
# REFRESH COOKIE
# ============================================================

def set_refresh_cookie(
    response: Response,
    refresh_token: str,
) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        max_age=(
            settings.refresh_token_expire_days
            * 24
            * 60
            * 60
        ),
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,
        path=settings.refresh_cookie_path,
        domain=settings.refresh_cookie_domain,
    )


def clear_refresh_cookie(
    response: Response,
) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path=settings.refresh_cookie_path,
        domain=settings.refresh_cookie_domain,
        secure=settings.refresh_cookie_secure,
        httponly=True,
        samesite=settings.refresh_cookie_samesite,
    )


# ============================================================
# AUTH RESPONSE
#
# Keep this refresh.
#
# Auth operations can update DB-managed values such as
# updated_at. Refreshing while we are still inside SQLAlchemy's
# async context prevents Pydantic from trying to lazy-load an
# expired attribute during serialization.
# ============================================================

async def build_auth_response(
    result: AuthResult,
    session: AsyncSession,
) -> AuthResponse:
    await session.refresh(
        result.user
    )

    return AuthResponse(
        access_token=(
            result.access_token
        ),
        expires_in=(
            settings
            .access_token_expire_minutes
            * 60
        ),
        user=(
            UserRead.model_validate(
                result.user
            )
        ),
    )


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    session: DbSession,
    redis: RedisClient,
) -> AuthResponse:
    (
        user_agent,
        ip_address,
    ) = get_client_metadata(
        request
    )

    await apply_limit(
        redis,
        key=(
            "register:ip:"
            f"{fingerprint(ip_address)}"
        ),
        limit=5,
        window_seconds=3600,
    )

    try:
        result = await AuthService(
            session
        ).register(
            payload,
            user_agent=user_agent,
            ip_address=ip_address,
        )

    except DuplicateAccountError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=str(
                exc
            ),
        ) from exc

    set_refresh_cookie(
        response,
        result.refresh_token,
    )

    return await build_auth_response(
        result,
        session,
    )


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=AuthResponse,
)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: DbSession,
    redis: RedisClient,
) -> AuthResponse:
    (
        user_agent,
        ip_address,
    ) = get_client_metadata(
        request
    )

    await apply_limit(
        redis,
        key=(
            "login:ip:"
            f"{fingerprint(ip_address)}"
        ),
        limit=20,
        window_seconds=900,
    )

    await apply_limit(
        redis,
        key=(
            "login:account:"
            f"{fingerprint(str(payload.email))}"
        ),
        limit=5,
        window_seconds=900,
    )

    try:
        result = await AuthService(
            session
        ).login(
            payload,
            user_agent=user_agent,
            ip_address=ip_address,
        )

    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Incorrect email "
                "or password."
            ),
        ) from exc

    except AccountLockedError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_429_TOO_MANY_REQUESTS
            ),
            detail=str(
                exc
            ),
            headers={
                "Retry-After":
                    str(
                        exc.retry_after
                    ),
            },
        ) from exc

    except PasswordResetRequiredError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_423_LOCKED
            ),
            detail=str(
                exc
            ),
        ) from exc

    except AccountUnavailableError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=str(
                exc
            ),
        ) from exc

    set_refresh_cookie(
        response,
        result.refresh_token,
    )

    return await build_auth_response(
        result,
        session,
    )


# ============================================================
# REFRESH ACCESS TOKEN
# ============================================================

@router.post(
    "/refresh",
    response_model=AuthResponse,
)
async def refresh_access_token(
    request: Request,
    response: Response,
    session: DbSession,
    redis: RedisClient,
) -> AuthResponse:
    ip_address = get_client_ip(
        request
    )

    await apply_limit(
        redis,
        key=(
            "refresh:ip:"
            f"{fingerprint(ip_address)}"
        ),
        limit=60,
        window_seconds=3600,
    )

    refresh_token = (
        request.cookies.get(
            settings.refresh_cookie_name
        )
    )

    if not refresh_token:
        clear_refresh_cookie(
            response
        )

        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Refresh token "
                "is missing."
            ),
        )

    try:
        result = await AuthService(
            session
        ).refresh(
            refresh_token,
            user_agent=(
                request.headers.get(
                    "user-agent"
                )
            ),
            ip_address=ip_address,
        )

    except (
        InvalidRefreshTokenError,
        AccountUnavailableError,
        PasswordResetRequiredError,
    ) as exc:
        clear_refresh_cookie(
            response
        )

        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=str(
                exc
            ),
        ) from exc

    set_refresh_cookie(
        response,
        result.refresh_token,
    )

    return await build_auth_response(
        result,
        session,
    )


# ============================================================
# LOGOUT
# ============================================================

@router.post(
    "/logout",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
async def logout(
    request: Request,
    response: Response,
    session: DbSession,
) -> None:
    refresh_token = (
        request.cookies.get(
            settings.refresh_cookie_name
        )
    )

    await AuthService(
        session
    ).logout(
        refresh_token
    )

    clear_refresh_cookie(
        response
    )


# ============================================================
# LOGOUT ALL
# ============================================================

@router.post(
    "/logout-all",
    response_model=MessageResponse,
)
async def logout_all(
    response: Response,
    session: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    await AuthService(
        session
    ).logout_all(
        current_user
    )

    clear_refresh_cookie(
        response
    )

    return MessageResponse(
        message=(
            "You have been logged out "
            "from all devices."
        ),
    )


# ============================================================
# FORGOT PASSWORD
# ============================================================

@router.post(
    "/forgot-password",
    response_model=MessageResponse,
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> MessageResponse:
    ip_address = get_client_ip(
        request
    )

    await apply_limit(
        redis,
        key=(
            "forgot-password:ip:"
            f"{fingerprint(ip_address)}"
        ),
        limit=5,
        window_seconds=3600,
    )

    await apply_limit(
        redis,
        key=(
            "forgot-password:account:"
            f"{fingerprint(str(payload.email))}"
        ),
        limit=3,
        window_seconds=3600,
    )

    await PasswordResetService(
        session
    ).request_reset(
        email=str(
            payload.email
        ),
        requested_ip=ip_address,
    )

    return MessageResponse(
        message=(
            "If an eligible account exists, "
            "reset instructions have been sent."
        ),
    )


# ============================================================
# RESET PASSWORD
# ============================================================

@router.post(
    "/reset-password",
    response_model=MessageResponse,
)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> MessageResponse:
    ip_address = get_client_ip(
        request
    )

    await apply_limit(
        redis,
        key=(
            "reset-password:ip:"
            f"{fingerprint(ip_address)}"
        ),
        limit=10,
        window_seconds=3600,
    )

    try:
        await PasswordResetService(
            session
        ).reset_password(
            raw_token=payload.token,
            new_password=(
                payload.new_password
            ),
        )

    except PasswordResetError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc

    return MessageResponse(
        message=(
            "Password reset successfully. "
            "Sign in with your new password."
        ),
    )


# ============================================================
# CHANGE PASSWORD
# ============================================================

@router.post(
    "/change-password",
    response_model=MessageResponse,
)
async def change_password(
    payload: ChangePasswordRequest,
    response: Response,
    session: DbSession,
    redis: RedisClient,
    current_user: CurrentUser,
) -> MessageResponse:
    await apply_limit(
        redis,
        key=(
            "change-password:user:"
            f"{current_user.id}"
        ),
        limit=10,
        window_seconds=3600,
    )

    try:
        await AuthService(
            session
        ).change_password(
            user_id=current_user.id,
            payload=payload,
        )

    except InvalidCurrentPasswordError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc

    clear_refresh_cookie(
        response
    )

    return MessageResponse(
        message=(
            "Password changed successfully. "
            "Sign in again on your devices."
        ),
    )