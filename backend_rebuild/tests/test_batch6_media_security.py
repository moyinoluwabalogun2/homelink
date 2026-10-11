import asyncio
from unittest.mock import AsyncMock
from uuid import uuid4

from app.services import media_service
from app.services.media_service import MediaService


def configure_cloudinary(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        media_service.settings,
        "cloudinary_enabled",
        True,
    )

    monkeypatch.setattr(
        media_service.settings,
        "cloudinary_cloud_name",
        "homelink-test",
    )

    monkeypatch.setattr(
        media_service.settings,
        "cloudinary_api_key",
        "test-api-key",
    )

    monkeypatch.setattr(
        media_service.settings,
        "cloudinary_api_secret",
        "test-api-secret",
    )

    monkeypatch.setattr(
        media_service.settings,
        "cloudinary_upload_folder",
        "homelink",
    )


def test_listing_signature_queues_unclaimed_upload(
    monkeypatch,
) -> None:
    configure_cloudinary(
        monkeypatch,
    )

    user_id = uuid4()
    session = AsyncMock()

    service = MediaService(
        session,
    )

    service.cleanup.enqueue_assets = (
        AsyncMock(
            return_value=1,
        )
    )

    result = asyncio.run(
        service.create_upload_signature(
            user_id=user_id,
            resource_type="image",
            scope="listings",
        )
    )

    expected_prefix = (
        f"homelink/listings/"
        f"{user_id}/"
    )

    assert result.folder == (
        f"homelink/listings/"
        f"{user_id}"
    )

    assert result.upload_public_id

    assert (
        result.expected_public_id
        == (
            f"{result.folder}/"
            f"{result.upload_public_id}"
        )
    )

    assert (
        result.expected_public_id
        .startswith(
            expected_prefix,
        )
    )

    assert (
        result.resource_type
        == "image"
    )

    assert (
        result.delivery_type
        == "upload"
    )

    service.cleanup.enqueue_assets.assert_awaited_once_with(
        assets=[
            (
                result.expected_public_id,
                "image",
                "upload",
                None,
            ),
        ],
        reason="unclaimed_upload",
    )


def test_agent_document_is_not_put_in_listing_cleanup_queue(
    monkeypatch,
) -> None:
    configure_cloudinary(
        monkeypatch,
    )

    user_id = uuid4()
    session = AsyncMock()

    service = MediaService(
        session,
    )

    service.cleanup.enqueue_assets = (
        AsyncMock(
            return_value=0,
        )
    )

    result = asyncio.run(
        service.create_upload_signature(
            user_id=user_id,
            resource_type="image",
            scope="agent-documents",
        )
    )

    assert (
        result.delivery_type
        == "authenticated"
    )

    assert (
        result.expected_public_id
        == (
            f"{result.folder}/"
            f"{result.upload_public_id}"
        )
    )

    service.cleanup.enqueue_assets.assert_not_awaited()


def test_listing_video_signature_is_restricted_to_user_folder(
    monkeypatch,
) -> None:
    configure_cloudinary(
        monkeypatch,
    )

    user_id = uuid4()
    session = AsyncMock()

    service = MediaService(
        session,
    )

    service.cleanup.enqueue_assets = (
        AsyncMock(
            return_value=1,
        )
    )

    result = asyncio.run(
        service.create_upload_signature(
            user_id=user_id,
            resource_type="video",
            scope="listings",
        )
    )

    assert (
        result.resource_type
        == "video"
    )

    assert result.folder == (
        f"homelink/listings/"
        f"{user_id}"
    )

    assert (
        result.expected_public_id
        == (
            f"{result.folder}/"
            f"{result.upload_public_id}"
        )
    )