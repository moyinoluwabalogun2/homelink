from app.main import app


EXPECTED_FINAL_PATHS = {
    "/api/v1/auth/email-verification/request",
    "/api/v1/auth/email-verification/confirm",
    "/api/v1/account/export",
    "/api/v1/account",
    "/api/v1/legal/privacy",
    "/api/v1/legal/terms",
    "/api/v1/legal/cookie-notice",
    "/api/v1/admin/users",
    "/api/v1/admin/users/{user_id}/status",
    "/api/v1/admin/users/{user_id}/role",
    "/api/v1/admin/audit-logs",
    "/api/v1/admin/maintenance/run",
    "/api/v1/health/live",
    "/api/v1/health/ready",
}


def test_final_batch_routes_registered() -> None:
    paths = set(app.openapi().get("paths", {}).keys())
    assert EXPECTED_FINAL_PATHS.issubset(paths)
    