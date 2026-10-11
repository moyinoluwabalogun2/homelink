from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import (
    TimeoutError as SQLAlchemyTimeoutError,
)

from app.core.config import Settings
from app.main import (
    database_capacity_timeout,
)


def test_runtime_capacity_defaults_are_bounded() -> None:
    settings = Settings(
        _env_file=None
    )

    assert settings.db_pool_size == 5

    assert (
        settings.db_max_overflow
        == 5
    )

    assert (
        settings.db_pool_timeout_seconds
        == 5
    )

    assert (
        settings.db_statement_timeout_ms
        == 15_000
    )

    assert (
        settings.redis_max_connections
        == 20
    )


def test_invalid_pool_size_is_rejected() -> None:
    try:
        Settings(
            _env_file=None,
            db_pool_size=0,
        )

    except ValueError as exc:
        assert (
            "DB_POOL_SIZE"
            in str(exc)
        )

    else:
        raise AssertionError(
            "An unbounded/empty pool "
            "must be rejected"
        )


def test_database_capacity_timeout_returns_retryable_503() -> None:
    app = FastAPI()

    app.add_exception_handler(
        SQLAlchemyTimeoutError,
        database_capacity_timeout,
    )

    @app.get(
        "/capacity-test"
    )
    async def capacity_test() -> None:
        raise SQLAlchemyTimeoutError(
            "pool exhausted"
        )

    response = TestClient(
        app
    ).get(
        "/capacity-test"
    )

    assert (
        response.status_code
        == 503
    )

    assert (
        response.headers[
            "retry-after"
        ]
        == "2"
    )

    assert (
        "temporarily busy"
        in response.json()[
            "detail"
        ]
    )