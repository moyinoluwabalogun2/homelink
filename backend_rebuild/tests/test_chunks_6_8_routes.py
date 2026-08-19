from app.main import app


EXPECTED_PATHS = {
    "/api/v1/saved-listings",
    "/api/v1/saved-listings/{listing_id}",
    "/api/v1/listings/{listing_id}/inquiries",
    "/api/v1/inquiries/sent",
    "/api/v1/inquiries/received",
    "/api/v1/inquiries/{inquiry_id}",
    "/api/v1/listings/{listing_id}/reports",
    "/api/v1/reports/mine",
    "/api/v1/admin/reports",
    "/api/v1/admin/reports/{report_id}",
    "/api/v1/notifications",
    "/api/v1/notifications/{notification_id}/read",
    "/api/v1/notifications/read-all",
    "/api/v1/dashboard/summary",
    "/api/v1/admin/dashboard/summary",
    "/api/v1/payments/plans",
    "/api/v1/payments/credits/me",
    "/api/v1/payments/initialize",
    "/api/v1/payments/paystack/webhook",
    "/api/v1/payments/mock/{reference}/complete",
    "/api/v1/payments/{reference}/verify",
    "/api/v1/media/upload-signature",
}


def test_chunks_6_8_routes_are_registered() -> None:
    paths = set(app.openapi().get("paths", {}).keys())
    assert EXPECTED_PATHS.issubset(paths)