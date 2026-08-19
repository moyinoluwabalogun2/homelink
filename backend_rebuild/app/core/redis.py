import json
from collections.abc import AsyncGenerator
from typing import Any
from uuid import UUID

from redis.asyncio import Redis

from app.core.config import get_settings


settings = get_settings()


redis_client = Redis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
)


def user_event_channel(
    user_id: UUID,
) -> str:
    return f"homelink:user:{user_id}:events"


async def publish_user_event(
    *,
    user_id: UUID,
    event_type: str,
    data: dict[str, Any],
) -> None:
    """
    Publish a lightweight real-time event for one user.

    Redis handles the fan-out, so this does not query Postgres
    and does not require frontend polling.
    """

    payload = json.dumps(
        {
            "type": event_type,
            "data": data,
        },
        separators=(",", ":"),
        default=str,
    )

    await redis_client.publish(
        user_event_channel(
            user_id,
        ),
        payload,
    )


async def get_redis_client() -> AsyncGenerator[
    Redis,
    None,
]:
    yield redis_client


async def close_redis_client() -> None:
    await redis_client.aclose()