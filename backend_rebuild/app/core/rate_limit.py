from dataclasses import dataclass
from hashlib import sha256

from fastapi import (
    HTTPException,
    Request,
    status,
)
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings


settings = get_settings()

RATE_LIMIT_SCRIPT = """
local current = redis.call("INCR", KEYS[1])
if current == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return {current, ttl}
"""


@dataclass(frozen=True)
class RateLimitResult:
    count: int
    limit: int
    remaining: int
    retry_after: int


class RateLimitExceeded(Exception):
    def __init__(
        self,
        retry_after: int,
    ) -> None:
        super().__init__(
            "Too many requests."
        )

        self.retry_after = max(
            1,
            retry_after,
        )


class RateLimiterUnavailable(Exception):
    pass


def fingerprint(
    value: str,
) -> str:
    return sha256(
        value
        .strip()
        .lower()
        .encode("utf-8")
    ).hexdigest()


def get_client_ip(
    request: Request,
) -> str:
    if settings.trust_proxy_headers:
        forwarded_for = (
            request.headers.get(
                "x-forwarded-for"
            )
        )

        if forwarded_for:
            return (
                forwarded_for
                .split(",")[0]
                .strip()
            )

    if request.client:
        return request.client.host

    return "unknown"


async def enforce_rate_limit(
    redis: Redis,
    *,
    key: str,
    limit: int,
    window_seconds: int,
) -> RateLimitResult:
    try:
        raw = await redis.eval(
            RATE_LIMIT_SCRIPT,
            1,
            f"homelink:rate:{key}",
            window_seconds,
        )

    except RedisError as exc:
        raise RateLimiterUnavailable(
            "Rate-limiting service is unavailable."
        ) from exc

    count = int(
        raw[0]
    )

    ttl = max(
        1,
        int(raw[1]),
    )

    if count > limit:
        raise RateLimitExceeded(
            ttl
        )

    return RateLimitResult(
        count=count,
        limit=limit,
        remaining=max(
            0,
            limit - count,
        ),
        retry_after=ttl,
    )


async def protect_endpoint(
    redis: Redis,
    *,
    key: str,
    limit: int,
    window_seconds: int,
    unavailable_message: str = (
        "Security protection is temporarily unavailable."
    ),
) -> RateLimitResult:
    """
    Apply a fail-closed endpoint limit and return API-safe errors.

    Fail-closed means sensitive write operations pause when Redis
    is unavailable instead of operating without abuse protection.
    """

    try:
        return await enforce_rate_limit(
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
                "Retry-After": str(
                    exc.retry_after
                ),
            },
        ) from exc

    except RateLimiterUnavailable as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=unavailable_message,
        ) from exc