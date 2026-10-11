import asyncio
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from redis.exceptions import (
    ConnectionError as RedisConnectionError,
)

from app.core.rate_limit import (
    protect_endpoint,
)


def test_endpoint_limit_returns_remaining_capacity() -> None:
    redis = AsyncMock()

    redis.eval.return_value = [
        3,
        60,
    ]

    result = asyncio.run(
        protect_endpoint(
            redis,
            key=(
                "media-signature:"
                "user:test-user"
            ),
            limit=30,
            window_seconds=60,
        )
    )

    assert result.count == 3
    assert result.limit == 30
    assert result.remaining == 27
    assert result.retry_after == 60


def test_endpoint_limit_returns_retryable_429() -> None:
    redis = AsyncMock()

    redis.eval.return_value = [
        11,
        271,
    ]

    with pytest.raises(
        HTTPException
    ) as error:
        asyncio.run(
            protect_endpoint(
                redis,
                key=(
                    "payment-initialize:"
                    "user:test-user"
                ),
                limit=10,
                window_seconds=600,
            )
        )

    assert (
        error.value.status_code
        == 429
    )

    assert error.value.headers == {
        "Retry-After": "271",
    }


def test_endpoint_limit_fails_closed_when_redis_is_down() -> None:
    redis = AsyncMock()

    redis.eval.side_effect = (
        RedisConnectionError(
            "redis unavailable"
        )
    )

    with pytest.raises(
        HTTPException
    ) as error:
        asyncio.run(
            protect_endpoint(
                redis,
                key=(
                    "listing-report:"
                    "user:test-user"
                ),
                limit=5,
                window_seconds=3600,
                unavailable_message=(
                    "Security protection is "
                    "temporarily unavailable."
                ),
            )
        )

    assert (
        error.value.status_code
        == 503
    )

    assert error.value.detail == (
        "Security protection is "
        "temporarily unavailable."
    )