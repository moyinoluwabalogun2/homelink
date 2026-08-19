from app.main import app


EXPECTED_LOCATION_PATHS = {
    "/api/v1/locations/bootstrap",
    "/api/v1/locations/states",
    "/api/v1/locations/cities",
    "/api/v1/locations/universities",
    "/api/v1/locations/campuses",
    "/api/v1/locations/areas",
}


def test_location_routes_registered(
) -> None:
    paths = set(
        app.openapi()
        .get("paths", {})
        .keys()
    )

    assert EXPECTED_LOCATION_PATHS.issubset(
        paths
    )