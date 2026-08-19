from fastapi import APIRouter, HTTPException, Request, status

from app.api.auth_dependencies import CurrentUserUnverifiedAllowed
from app.api.dependencies import DbSession, RedisClient
from app.core.rate_limit import (
    RateLimitExceeded,
    RateLimiterUnavailable,
    enforce_rate_limit,
    fingerprint,
    get_client_ip,
)
from app.schemas.finalization import (
    EmailVerificationConfirmRequest,
    MessageResponse,
)
from app.services.email_verification_service import (
    EmailVerificationError,
    EmailVerificationService,
)


router = APIRouter(
    prefix="/auth/email-verification",
    tags=["email-verification"],
)


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
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(exc.retry_after)},
        ) from exc
    except RateLimiterUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Security service is temporarily unavailable.",
        ) from exc


@router.post("/request", response_model=MessageResponse)
async def request_email_verification(
    request: Request,
    session: DbSession,
    redis: RedisClient,
    current_user: CurrentUserUnverifiedAllowed,
) -> MessageResponse:
    await apply_limit(
        redis,
        key=f"verify-email:user:{current_user.id}",
        limit=3,
        window_seconds=3600,
    )

    sent = await EmailVerificationService(session).request_for_user(
        user=current_user,
        requested_ip=get_client_ip(request),
    )
    if not sent:
        return MessageResponse(message="Email is already verified.")
    return MessageResponse(
        message="Verification instructions have been sent."
    )


@router.post("/confirm", response_model=MessageResponse)
async def confirm_email_verification(
    payload: EmailVerificationConfirmRequest,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> MessageResponse:
    await apply_limit(
        redis,
        key=f"verify-email:ip:{fingerprint(get_client_ip(request))}",
        limit=10,
        window_seconds=3600,
    )

    try:
        await EmailVerificationService(session).confirm(raw_token=payload.token)
    except EmailVerificationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return MessageResponse(message="Email verified successfully.")