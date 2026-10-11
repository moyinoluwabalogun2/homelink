import inspect

import app.models  # noqa: F401

from app.db.base import Base
from app.models.enums import ListingStatus
from app.models.media_cleanup import MediaCleanupJob
from app.services.listing_edit_service import (
    ListingEditService,
)
from app.services.listing_service import ListingService
from app.services.media_cleanup_service import (
    MediaCleanupService,
)


def test_batch6_database_tables_registered() -> None:
    registered_tables = set(
        Base.metadata.tables,
    )

    assert (
        "media_cleanup_jobs"
        in registered_tables
    )


def test_media_cleanup_table_has_required_columns() -> None:
    columns = {
        column.name
        for column
        in MediaCleanupJob.__table__.columns
    }

    assert {
        "id",
        "storage_public_id",
        "resource_type",
        "delivery_type",
        "reason",
        "listing_id",
        "attempts",
        "last_error",
        "created_at",
        "updated_at",
    }.issubset(columns)


def test_media_cleanup_asset_is_unique() -> None:
    constraint_names = {
        constraint.name
        for constraint
        in MediaCleanupJob.__table__.constraints
        if constraint.name
    }

    assert (
        "uq_media_cleanup_jobs_asset"
        in constraint_names
    )


def test_lifecycle_statuses_exist() -> None:
    assert (
        ListingStatus.SOLD.value
        == "sold"
    )

    assert (
        ListingStatus.RENTED.value
        == "rented"
    )

    assert (
        ListingStatus.ARCHIVED.value
        == "archived"
    )


def test_lifecycle_recovery_windows() -> None:
    assert (
        ListingService
        .COMPLETION_UNDO_HOURS
        == 24
    )

    assert (
        ListingService
        .MEDIA_RECOVERY_DAYS
        == 30
    )

    assert (
        MediaCleanupService
        .UNCLAIMED_UPLOAD_GRACE_HOURS
        == 24
    )


def test_listing_edit_service_does_not_use_credit_service() -> None:
    source = inspect.getsource(
        ListingEditService,
    )

    assert (
        "CreditService"
        not in source
    )

    assert (
        "consume_for_listing"
        not in source
    )


def test_listing_edit_uses_durable_cleanup_queue() -> None:
    source = inspect.getsource(
        ListingEditService,
    )

    assert (
        "enqueue_removed_listing_media"
        in source
    )


def test_credit_consumption_remains_on_submission() -> None:
    source = inspect.getsource(
        ListingService.submit,
    )

    assert (
        "consume_for_listing"
        in source
    )


def test_delete_restore_and_completion_do_not_consume_credit() -> None:
    lifecycle_methods = [
        ListingService.complete,
        ListingService.reopen_completed,
        ListingService.soft_delete,
        ListingService.restore,
    ]

    for method in lifecycle_methods:
        source = inspect.getsource(
            method,
        )

        assert (
            "consume_for_listing"
            not in source
        )