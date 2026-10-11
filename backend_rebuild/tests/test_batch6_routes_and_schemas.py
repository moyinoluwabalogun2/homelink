from app.main import app
from app.schemas.listing import (
    ListingMediaRead,
    ListingRead,
    OwnedListingMediaRead,
    OwnedListingRead,
)


EXPECTED_BATCH6_PATHS = {
    "/api/v1/listings/mine/recently-deleted",
    "/api/v1/listings/mine/{listing_id}",
    "/api/v1/listings/{listing_id}/complete",
    "/api/v1/listings/{listing_id}/reopen",
    "/api/v1/listings/{listing_id}/restore",
    "/api/v1/listings/{listing_id}/rental",
    "/api/v1/listings/{listing_id}/buy-property",
    "/api/v1/listings/{listing_id}/marketplace",
}


def test_batch6_routes_registered() -> None:
    paths = set(
        app.openapi()
        .get(
            "paths",
            {},
        )
        .keys()
    )

    assert (
        EXPECTED_BATCH6_PATHS
        .issubset(paths)
    )


def test_batch6_route_methods() -> None:
    paths = app.openapi().get(
        "paths",
        {},
    )

    assert (
        "get"
        in paths[
            "/api/v1/listings/mine/recently-deleted"
        ]
    )

    assert (
        "get"
        in paths[
            "/api/v1/listings/mine/{listing_id}"
        ]
    )

    assert (
        "post"
        in paths[
            "/api/v1/listings/{listing_id}/complete"
        ]
    )

    assert (
        "post"
        in paths[
            "/api/v1/listings/{listing_id}/reopen"
        ]
    )

    assert (
        "post"
        in paths[
            "/api/v1/listings/{listing_id}/restore"
        ]
    )

    assert (
        "put"
        in paths[
            "/api/v1/listings/{listing_id}/rental"
        ]
    )

    assert (
        "put"
        in paths[
            "/api/v1/listings/{listing_id}/buy-property"
        ]
    )

    assert (
        "put"
        in paths[
            "/api/v1/listings/{listing_id}/marketplace"
        ]
    )


def test_public_media_schema_hides_storage_id() -> None:
    assert (
        "storage_public_id"
        not in ListingMediaRead.model_fields
    )


def test_owner_media_schema_exposes_storage_id() -> None:
    assert (
        "storage_public_id"
        in OwnedListingMediaRead.model_fields
    )


def test_listing_lifecycle_fields_present() -> None:
    required_fields = {
        "completed_at",
        "deleted_at",
        "media_purge_after",
    }

    assert required_fields.issubset(
        ListingRead.model_fields,
    )


def test_owner_listing_schema_uses_owner_media() -> None:
    media_field = (
        OwnedListingRead
        .model_fields["media"]
    )

    annotation_text = str(
        media_field.annotation,
    )

    assert (
        "OwnedListingMediaRead"
        in annotation_text
    )