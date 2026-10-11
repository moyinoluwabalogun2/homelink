from __future__ import annotations

import asyncio
from collections.abc import (
    AsyncIterator,
)
from contextlib import (
    asynccontextmanager,
    suppress,
)

from fastapi import (
    FastAPI,
    Request,
)
from fastapi.middleware.cors import (
    CORSMiddleware,
)
from fastapi.middleware.gzip import (
    GZipMiddleware,
)
from fastapi.middleware.trustedhost import (
    TrustedHostMiddleware,
)
from fastapi.responses import (
    JSONResponse,
)
from sqlalchemy.exc import (
    TimeoutError as SQLAlchemyTimeoutError,
)

from app.api.v1.router import (
    api_router,
)
from app.core.config import (
    get_settings,
)
from app.core.logging import (
    configure_logging,
)
from app.core.redis import (
    close_redis_client,
)
from app.db.session import (
    dispose_database_engine,
)
from app.middleware.audit import (
    AuditLogMiddleware,
)
from app.middleware.request_limits import (
    RequestBodyLimitMiddleware,
)
from app.middleware.request_metrics import (
    RequestMetricsMiddleware,
)
from app.middleware.security_headers import (
    SecurityHeadersMiddleware,
)
from app.services.maintenance_scheduler import (
    run_maintenance_scheduler,
)


settings = get_settings()


configure_logging(
    settings.log_level
)


production = (
    settings.environment
    == "production"
)


@asynccontextmanager
async def lifespan(
    _: FastAPI,
) -> AsyncIterator[None]:
    maintenance_task = (
        asyncio.create_task(
            run_maintenance_scheduler(),
            name=(
                "homelink-maintenance"
            ),
        )
    )

    try:
        yield

    finally:
        maintenance_task.cancel()

        with suppress(
            asyncio.CancelledError
        ):
            await maintenance_task

        await close_redis_client()

        await (
            dispose_database_engine()
        )


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
    docs_url=(
        None
        if production
        else "/docs"
    ),
    redoc_url=(
        None
        if production
        else "/redoc"
    ),
    openapi_url=(
        None
        if production
        else "/openapi.json"
    ),
)


@app.get(
    "/",
    include_in_schema=False,
)
async def root() -> dict[
    str,
    str,
]:
    """
    Cheap deployment and service check.

    This endpoint does not query PostgreSQL or Redis.
    """

    return {
        "status": "running",
        "service": (
            settings.app_name
        ),
        "version": (
            settings.app_version
        ),
    }


@app.exception_handler(
    SQLAlchemyTimeoutError
)
async def database_capacity_timeout(
    _: Request,
    __: SQLAlchemyTimeoutError,
) -> JSONResponse:
    """
    Return a safe retryable response if the bounded PostgreSQL
    pool is temporarily exhausted.

    Raw SQLAlchemy errors are never returned to users.
    """

    return JSONResponse(
        status_code=503,
        content={
            "detail": (
                "The service is "
                "temporarily busy. "
                "Please retry shortly."
            ),
        },
        headers={
            "Retry-After": "2",
            "Cache-Control": (
                "no-store"
            ),
        },
    )


app.include_router(
    api_router,
    prefix=(
        settings.api_v1_prefix
    ),
)


app.add_middleware(
    AuditLogMiddleware
)


app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        settings.cors_origins
    ),
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Requested-With",
        "X-Request-ID",
    ],
    expose_headers=[
        "X-Request-ID",
        "Retry-After",
    ],
)


app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=(
        settings.allowed_hosts
    ),
)


app.add_middleware(
    RequestBodyLimitMiddleware,
    max_bytes=(
        settings
        .max_request_body_bytes
    ),
)


app.add_middleware(
    RequestMetricsMiddleware,
    slow_request_ms=1_500,
)


# Keep this last so it remains the outer response-header layer.
app.add_middleware(
    SecurityHeadersMiddleware,
    production=production,
)