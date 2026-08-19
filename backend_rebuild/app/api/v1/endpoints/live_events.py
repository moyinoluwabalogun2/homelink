import asyncio
from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.responses import StreamingResponse
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from app.core.config import get_settings
from app.core.redis import (
    redis_client,
    user_event_channel,
)
from app.core.security import (
    AccessTokenError,
    decode_access_token,
)
from app.db.session import AsyncSessionFactory
from app.models.enums import AccountStatus
from app.repositories.user_repository import UserRepository


router = APIRouter(
    tags=["live-events"],
)

settings = get_settings()

bearer_scheme = HTTPBearer(
    auto_error=False,
)


async def authenticate_stream_user(
    credentials: HTTPAuthorizationCredentials | None,
) -> UUID:
    """
    Authenticate the SSE connection using a short-lived
    PostgreSQL session.

    The database session is CLOSED before the long-running
    Redis stream begins.
    """

    authentication_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=(
            "Authentication credentials "
            "are invalid or missing."
        ),
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )

    if credentials is None:
        raise authentication_error

    try:
        token_data = decode_access_token(
            credentials.credentials
        )

    except AccessTokenError as exc:
        raise authentication_error from exc

    # ---------------------------------------------------------
    # SHORT DB SESSION
    #
    # This exists only long enough to validate the account.
    # It is gone before StreamingResponse is returned.
    # ---------------------------------------------------------

    async with AsyncSessionFactory() as session:
        user = await UserRepository(
            session
        ).get_by_id(
            token_data.user_id
        )

        if (
            user is None
            or user.deleted_at is not None
        ):
            raise authentication_error

        if (
            user.status
            != AccountStatus.ACTIVE
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "This account is not active."
                ),
            )

        if user.requires_password_reset:
            raise HTTPException(
                status_code=423,
                detail=(
                    "Password reset is required."
                ),
            )

        if (
            user.auth_version
            != token_data.auth_version
            or user.role
            != token_data.role
        ):
            raise authentication_error

        if (
            settings.email_verification_required
            and not user.is_email_verified
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Email verification is required."
                ),
            )

        user_id = user.id

    # DB session has been released here.
    return user_id


async def event_stream(
    *,
    request: Request,
    user_id: UUID,
) -> AsyncIterator[str]:
    """
    One Redis subscription per connected user.

    No PostgreSQL polling.
    No repeated HTTP requests.
    """

    pubsub = redis_client.pubsub()

    channel = user_event_channel(
        user_id
    )

    await pubsub.subscribe(
        channel
    )

    try:
        # Initial event confirms that the connection is alive.
        yield (
            "event: connected\n"
            'data: {"type":"connected"}\n\n'
        )

        while True:
            if await request.is_disconnected():
                break

            try:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=20.0,
                )

            except asyncio.CancelledError:
                break

            if message is None:
                # SSE heartbeat.
                #
                # This keeps proxies/browsers from treating an
                # otherwise quiet stream as dead.
                yield ": keep-alive\n\n"
                continue

            if (
                message.get("type")
                != "message"
            ):
                continue

            data = message.get(
                "data"
            )

            if not isinstance(
                data,
                str,
            ):
                continue

            # publish_user_event already serializes a safe JSON
            # envelope:
            #
            # {
            #   "type": "...",
            #   "data": {...}
            # }
            #
            # Forward it directly to the browser.
            yield (
                "event: homelink\n"
                f"data: {data}\n\n"
            )

    finally:
        try:
            await pubsub.unsubscribe(
                channel
            )
        finally:
            await pubsub.aclose()


@router.get(
    "/events/stream",
)
async def stream_events(
    request: Request,
    credentials: HTTPAuthorizationCredentials
    | None = Depends(
        bearer_scheme
    ),
) -> StreamingResponse:
    """
    Authenticated HomeLink real-time event stream.

    PostgreSQL is touched only during authentication.
    The long-running connection listens exclusively to Redis.
    """

    user_id = await authenticate_stream_user(
        credentials
    )

    return StreamingResponse(
        event_stream(
            request=request,
            user_id=user_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control":
                "no-cache, no-transform",
            "Connection":
                "keep-alive",
            "X-Accel-Buffering":
                "no",
        },
    )