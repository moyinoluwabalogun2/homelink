from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator
from typing import Any
from uuid import UUID

from redis.asyncio import Redis
from redis.asyncio.connection import ConnectionPool

from app.core.config import get_settings


logger = logging.getLogger(__name__)

settings = get_settings()


redis_connection_pool = ConnectionPool.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
    max_connections=(
        settings.redis_max_connections
    ),
    socket_connect_timeout=(
        settings.redis_connect_timeout_seconds
    ),
    socket_timeout=(
        settings.redis_socket_timeout_seconds
    ),
    health_check_interval=(
        settings.redis_health_check_interval_seconds
    ),
    retry_on_timeout=True,
)


redis_client = Redis(
    connection_pool=redis_connection_pool,
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
) -> bool:
    """
    Publish a lightweight event for one signed-in user.

    A temporary Redis interruption must not roll back the
    user's main database operation, so publishing fails safely.
    """

    payload = json.dumps(
        {
            "type": event_type,
            "data": data,
        },
        separators=(",", ":"),
        default=str,
    )

    try:
        await redis_client.publish(
            user_event_channel(user_id),
            payload,
        )

    except Exception:
        logger.exception(
            "Could not publish Redis event '%s' for user %s.",
            event_type,
            user_id,
        )

        return False

    return True


async def get_redis_client() -> AsyncGenerator[
    Redis,
    None,
]:
    """
    Return the shared Redis client.

    The shared connection pool is closed once during application
    shutdown rather than after every request.
    """

    yield redis_client


async def close_redis_client() -> None:
    """
    Release Redis connections during application shutdown.
    """

    await redis_client.aclose()
    await redis_connection_pool.disconnect()