from __future__ import annotations

import asyncio
import logging
from time import perf_counter
from typing import Awaitable, Callable

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import get_settings
from app.core.redis import redis_client
from app.db.session import engine


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/health",
    tags=["health"],
)

settings = get_settings()

NO_STORE_HEADERS = {
    "Cache-Control": "no-store, max-age=0",
}


@router.get("")
@router.get("/live")
async def liveness() -> JSONResponse:
    """
    Cheap process liveness check.

    Render may call this frequently, so it intentionally performs
    no PostgreSQL or Redis operation.
    """

    return JSONResponse(
        status_code=200,
        headers=NO_STORE_HEADERS,
        content={
            "status": "ok",
            "service": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
        },
    )


async def check_database() -> str:
    try:
        async with asyncio.timeout(3):
            async with engine.connect() as connection:
                await connection.execute(
                    text("SELECT 1")
                )

        return "ok"

    except Exception as exc:
        logger.warning(
            "PostgreSQL readiness check failed: %s",
            type(exc).__name__,
        )

        return "unavailable"


async def check_redis() -> str:
    try:
        async with asyncio.timeout(3):
            result = await redis_client.ping()

        return "ok" if result else "unavailable"

    except Exception as exc:
        logger.warning(
            "Redis readiness check failed: %s",
            type(exc).__name__,
        )

        return "unavailable"


async def timed_check(
    check: Callable[[], Awaitable[str]],
) -> tuple[str, int]:
    started_at = perf_counter()
    status = await check()

    elapsed_ms = max(
        0,
        round(
            (perf_counter() - started_at) * 1000
        ),
    )

    return status, elapsed_ms


@router.get("/ready")
async def readiness() -> JSONResponse:
    """
    Dependency readiness check.

    This endpoint verifies PostgreSQL and Redis concurrently.
    The frontend must not poll it. It is intended for deployment
    diagnostics and external uptime monitoring.
    """

    database_result, redis_result = await asyncio.gather(
        timed_check(check_database),
        timed_check(check_redis),
    )

    database_status, database_latency = database_result
    redis_status, redis_latency = redis_result

    ready = (
        database_status == "ok"
        and redis_status == "ok"
    )

    return JSONResponse(
        status_code=200 if ready else 503,
        headers=NO_STORE_HEADERS,
        content={
            "status": (
                "ready"
                if ready
                else "not_ready"
            ),
            "checks": {
                "database": {
                    "status": database_status,
                    "latency_ms": database_latency,
                },
                "redis": {
                    "status": redis_status,
                    "latency_ms": redis_latency,
                },
            },
        },
    )