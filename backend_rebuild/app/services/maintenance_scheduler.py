import asyncio
import logging
from contextlib import suppress
from datetime import UTC, datetime, timedelta

from app.core.redis import redis_client
from app.db.session import AsyncSessionFactory
from app.services.maintenance_service import MaintenanceService


logger = logging.getLogger(__name__)

LOCK_TTL_SECONDS = 60 * 60
DONE_TTL_SECONDS = 60 * 60 * 48

MAINTENANCE_HOUR_UTC = 3


def _seconds_until_next_run() -> float:
    now = datetime.now(UTC)

    next_run = now.replace(
        hour=MAINTENANCE_HOUR_UTC,
        minute=0,
        second=0,
        microsecond=0,
    )

    if next_run <= now:
        next_run += timedelta(
            days=1
        )

    return max(
        1.0,
        (
            next_run - now
        ).total_seconds(),
    )


async def _run_once_for_today() -> None:
    """
    Run maintenance at most once per UTC calendar day.

    Redis coordinates multiple API workers, so only one worker
    performs the database / Cloudinary maintenance.
    """

    today = datetime.now(
        UTC
    ).date().isoformat()

    lock_key = (
        f"homelink:maintenance:"
        f"{today}:lock"
    )

    done_key = (
        f"homelink:maintenance:"
        f"{today}:done"
    )

    try:
        already_done = await redis_client.exists(
            done_key
        )

        if already_done:
            return

        acquired = await redis_client.set(
            lock_key,
            "1",
            nx=True,
            ex=LOCK_TTL_SECONDS,
        )

        if not acquired:
            return

    except Exception:
        # Never run destructive maintenance without the
        # distributed lock when multiple workers may exist.
        logger.exception(
            "Could not acquire maintenance Redis lock."
        )
        return

    try:
        # Check again after acquiring the lock in case another
        # worker completed immediately before this worker.
        if await redis_client.exists(
            done_key
        ):
            return

        async with AsyncSessionFactory() as session:
            try:
                result = await MaintenanceService(
                    session
                ).run()

            except Exception:
                await session.rollback()
                raise

        await redis_client.set(
            done_key,
            "1",
            ex=DONE_TTL_SECONDS,
        )

        logger.info(
            "Automatic maintenance completed: %s",
            result,
        )

    except Exception:
        logger.exception(
            "Automatic HomeLink maintenance failed."
        )

    finally:
        with suppress(
            Exception
        ):
            await redis_client.delete(
                lock_key
            )


async def run_maintenance_scheduler() -> None:
    """
    Persistent lightweight scheduler.

    - Attempts maintenance once when the API starts.
    - Then sleeps until 03:00 UTC.
    - Redis prevents duplicate work across workers.
    - No PostgreSQL polling loop.
    """

    await _run_once_for_today()

    while True:
        delay = (
            _seconds_until_next_run()
        )

        await asyncio.sleep(
            delay
        )

        await _run_once_for_today()