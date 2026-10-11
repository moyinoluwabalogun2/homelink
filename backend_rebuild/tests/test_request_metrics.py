import logging

from fastapi import FastAPI
from fastapi.testclient import (
    TestClient,
)

from app.middleware.request_metrics import (
    RequestMetricsMiddleware,
)


def build_app(
    *,
    slow_request_ms: int = 1_500,
) -> FastAPI:
    app = FastAPI()

    app.add_middleware(
        RequestMetricsMiddleware,
        slow_request_ms=(
            slow_request_ms
        ),
    )

    @app.get(
        "/ok"
    )
    async def ok() -> dict[
        str,
        bool,
    ]:
        return {
            "ok": True,
        }

    return app


def test_request_id_is_returned_and_preserved() -> None:
    client = TestClient(
        build_app()
    )

    generated = client.get(
        "/ok"
    )

    assert (
        generated.status_code
        == 200
    )

    assert generated.headers[
        "x-request-id"
    ]

    supplied = client.get(
        "/ok",
        headers={
            "X-Request-ID": (
                "frontend-request-123"
            ),
        },
    )

    assert (
        supplied.headers[
            "x-request-id"
        ]
        == "frontend-request-123"
    )


def test_unsafe_request_id_is_replaced() -> None:
    client = TestClient(
        build_app()
    )

    response = client.get(
        "/ok",
        headers={
            "X-Request-ID": (
                "bad request id!"
            ),
        },
    )

    assert (
        response.status_code
        == 200
    )

    assert (
        response.headers[
            "x-request-id"
        ]
        != "bad request id!"
    )


def test_completed_request_log_excludes_query_string(
    caplog,
) -> None:
    client = TestClient(
        build_app()
    )

    with caplog.at_level(
        logging.INFO,
        logger=(
            "app.middleware."
            "request_metrics"
        ),
    ):
        response = client.get(
            "/ok?"
            "token=must-not-appear"
        )

    assert (
        response.status_code
        == 200
    )

    combined = "\n".join(
        record.getMessage()
        for record in caplog.records
        if record.name
        == (
            "app.middleware."
            "request_metrics"
        )
    )

    assert (
        "request_complete"
        in combined
    )

    assert (
        "path=/ok"
        in combined
    )

    assert (
        "must-not-appear"
        not in combined
    )