from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


settings = get_settings()


def create_database_engine() -> AsyncEngine:
    """
    Create one shared asynchronous database engine.

    Registered users do not equal open database connections.
    A controlled pool allows thousands of users to share a
    small number of reusable PostgreSQL connections.
    """

    return create_async_engine(
        settings.database_url,
        echo=settings.sql_echo,
        pool_pre_ping=True,
        pool_recycle=(
            settings.db_pool_recycle_seconds
        ),
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=(
            settings.db_pool_timeout_seconds
        ),
        pool_use_lifo=True,
        connect_args={
            "connect_timeout": (
                settings.db_connect_timeout_seconds
            ),
            "options": (
                "-c statement_timeout="
                f"{settings.db_statement_timeout_ms}"
            ),
        },
    )


engine = create_database_engine()


AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db_session() -> AsyncGenerator[
    AsyncSession,
    None,
]:
    """
    Supply one short-lived session per request.

    The session and its connection are always released after
    the request, including when an endpoint raises an error.
    """

    async with AsyncSessionFactory() as session:
        try:
            yield session

        except Exception:
            await session.rollback()
            raise

        finally:
            await session.close()


async def dispose_database_engine() -> None:
    """
    Close all pooled PostgreSQL connections during shutdown.
    """

    await engine.dispose()