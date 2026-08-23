import asyncio

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import get_settings
from app.core.redis import redis_client
from app.db.session import AsyncSessionFactory


router = APIRouter(
    prefix="/health",
    tags=["health"],
)

settings = get_settings()


# ============================================================
# LIVENESS
#
# Cheap check.
#
# No PostgreSQL.
# No Redis.
#
# Safe for frontend connection detection.
# ============================================================


@router.get("")
@router.get("/live")
async def liveness() -> dict[str, str]:
    return {
        "status":
            "ok",

        "service":
            settings.app_name,

        "version":
            settings.app_version,
    }


# ============================================================
# READINESS HELPERS
# ============================================================


async def check_database() -> str:
    try:
        async with asyncio.timeout(
            3,
        ):
            async with AsyncSessionFactory() as session:
                await session.execute(
                    text(
                        "SELECT 1"
                    )
                )

        return "ok"

    except Exception:
        return "unavailable"


async def check_redis() -> str:
    try:
        async with asyncio.timeout(
            3,
        ):
            await redis_client.ping()

        return "ok"

    except Exception:
        return "unavailable"


# ============================================================
# READINESS
#
# Infrastructure/deployment check.
#
# This intentionally verifies PostgreSQL + Redis.
# The frontend should NOT poll this endpoint.
# ============================================================


@router.get("/ready")
async def readiness() -> JSONResponse:
    database_status, redis_status = (
        await asyncio.gather(
            check_database(),
            check_redis(),
        )
    )

    checks = {
        "database":
            database_status,

        "redis":
            redis_status,
    }

    ready = (
        database_status
        == "ok"
        and redis_status
        == "ok"
    )

    return JSONResponse(
        status_code=(
            200
            if ready
            else 503
        ),
        content={
            "status":
                (
                    "ready"
                    if ready
                    else "not_ready"
                ),

            "checks":
                checks,
        },
    )