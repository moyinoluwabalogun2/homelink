from fastapi import (
    FastAPI,
    Request,
)

from fastapi.testclient import (
    TestClient,
)

from app.middleware.request_limits import (
    RequestBodyLimitMiddleware,
)


def build_app(
    max_bytes: int = 32,
) -> FastAPI:
    app = FastAPI()

    @app.post(
        "/echo"
    )
    async def echo(
        request: Request,
    ) -> dict[str, int]:
        body = (
            await request.body()
        )

        return {
            "size": len(
                body
            ),
        }

    app.add_middleware(
        RequestBodyLimitMiddleware,
        max_bytes=max_bytes,
    )

    return app


def test_declared_oversized_body_is_rejected() -> None:
    response = TestClient(
        build_app()
    ).post(
        "/echo",
        content=b"x" * 33,
    )

    assert (
        response.status_code
        == 413
    )

    assert response.json() == {
        "detail":
            "Request body is too large.",
    }

    assert (
        response.headers[
            "cache-control"
        ]
        == "no-store"
    )


def test_body_within_limit_is_accepted() -> None:
    response = TestClient(
        build_app()
    ).post(
        "/echo",
        content=b"x" * 32,
    )

    assert (
        response.status_code
        == 200
    )

    assert response.json() == {
        "size": 32,
    }


def test_chunked_oversized_body_is_rejected() -> None:
    def chunks():
        yield b"x" * 20
        yield b"x" * 20

    response = TestClient(
        build_app()
    ).post(
        "/echo",
        content=chunks(),
    )

    assert (
        response.status_code
        == 413
    )