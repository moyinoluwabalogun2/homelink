import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.redis import close_redis_client
from app.db.session import dispose_database_engine
from app.middleware.audit import AuditLogMiddleware
from app.services.maintenance_scheduler import (
    run_maintenance_scheduler,
)


settings = get_settings()

configure_logging(
    settings.log_level
)


@asynccontextmanager
async def lifespan(
    _: FastAPI,
) -> AsyncIterator[None]:
    maintenance_task = asyncio.create_task(
        run_maintenance_scheduler(),
        name="homelink-maintenance",
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

        await dispose_database_engine()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
)


app.add_middleware(
    AuditLogMiddleware
)


app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=(
        settings.allowed_hosts
    ),
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
    ],
)


app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,
)


app.include_router(
    api_router,
    prefix=settings.api_v1_prefix,
)