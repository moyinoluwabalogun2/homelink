from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.v1.endpoints import health
from app.main import app


client = TestClient(app)


def test_root_endpoint() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_liveness_endpoint() -> None:
    response = client.get(
        "/api/v1/health/live"
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.headers["cache-control"] == (
        "no-store, max-age=0"
    )


def test_health_alias() -> None:
    response = client.get(
        "/api/v1/health"
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readiness_when_dependencies_are_available(
    monkeypatch,
) -> None:
    async def database_ok() -> str:
        return "ok"

    async def redis_ok() -> str:
        return "ok"

    monkeypatch.setattr(
        health,
        "check_database",
        database_ok,
    )

    monkeypatch.setattr(
        health,
        "check_redis",
        redis_ok,
    )

    response = client.get(
        "/api/v1/health/ready"
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["status"] == "ready"
    assert (
        payload["checks"]["database"]["status"]
        == "ok"
    )
    assert (
        payload["checks"]["redis"]["status"]
        == "ok"
    )


def test_readiness_when_database_is_unavailable(
    monkeypatch,
) -> None:
    async def database_unavailable() -> str:
        return "unavailable"

    async def redis_ok() -> str:
        return "ok"

    monkeypatch.setattr(
        health,
        "check_database",
        database_unavailable,
    )

    monkeypatch.setattr(
        health,
        "check_redis",
        redis_ok,
    )

    response = client.get(
        "/api/v1/health/ready"
    )

    payload = response.json()

    assert response.status_code == 503
    assert payload["status"] == "not_ready"
    assert (
        payload["checks"]["database"]["status"]
        == "unavailable"
    )


def test_readiness_when_redis_is_unavailable(
    monkeypatch,
) -> None:
    async def database_ok() -> str:
        return "ok"

    async def redis_unavailable() -> str:
        return "unavailable"

    monkeypatch.setattr(
        health,
        "check_database",
        database_ok,
    )

    monkeypatch.setattr(
        health,
        "check_redis",
        redis_unavailable,
    )

    response = client.get(
        "/api/v1/health/ready"
    )

    payload = response.json()

    assert response.status_code == 503
    assert payload["status"] == "not_ready"
    assert (
        payload["checks"]["redis"]["status"]
        == "unavailable"
    )