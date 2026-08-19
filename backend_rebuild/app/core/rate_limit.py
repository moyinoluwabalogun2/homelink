from dataclasses import dataclass
from hashlib import sha256

from fastapi import Request
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
    def __init__(self, retry_after: int) -> None:
        super().__init__("Too many requests.")
        self.retry_after = max(1, retry_after)


class RateLimiterUnavailable(Exception):
    pass


def fingerprint(value: str) -> str:
    return sha256(value.strip().lower().encode("utf-8")).hexdigest()


def get_client_ip(request: Request) -> str:
    if settings.trust_proxy_headers:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

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
        raise RateLimiterUnavailable("Rate-limiting service is unavailable.") from exc

    count = int(raw[0])
    ttl = max(1, int(raw[1]))

    if count > limit:
        raise RateLimitExceeded(ttl)

    return RateLimitResult(
        count=count,
        limit=limit,
        remaining=max(0, limit - count),
        retry_after=ttl,
    )