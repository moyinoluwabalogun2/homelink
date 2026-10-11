import asyncio
from pathlib import Path
from unittest.mock import (
    AsyncMock,
)
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.services import media_service
from app.services.media_service import (
    MediaService,
)


ROOT = Path(__file__).resolve().parents[1]


def configure_media_settings(
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

    monkeypatch.setattr(
        media_service.settings,
        "secret_key",
        (
            "test-secret-key-that-is-long-"
            "enough-for-advertisement-tests"
        ),
    )


def test_advertisement_signature_uses_advertisement_folder(
    monkeypatch,
) -> None:
    configure_media_settings(
        monkeypatch
    )

    session = AsyncMock()

    service = MediaService(
        session
    )

    service.cleanup.enqueue_assets = (
        AsyncMock(
            return_value=1
        )
    )

    result = asyncio.run(
        service
        .create_advertisement_upload_signature()
    )

    assert (
        result.resource_type
        == "image"
    )

    assert (
        result.delivery_type
        == "upload"
    )

    assert result.folder.startswith(
        "homelink/advertisements/"
    )

    assert (
        result.expected_public_id
        == (
            f"{result.folder}/"
            f"{result.upload_public_id}"
        )
    )

    assert result.claim_token
    assert (
        result.claim_token_expires_at
        is not None
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


def test_valid_advertisement_claim_token_is_accepted(
    monkeypatch,
) -> None:
    configure_media_settings(
        monkeypatch
    )

    service = MediaService(
        AsyncMock()
    )

    public_id = (
        "homelink/advertisements/"
        f"{uuid4().hex}/"
        f"{uuid4().hex}"
    )

    token = (
        service
        ._create_advertisement_claim_token(
            public_id=public_id,
            expires_at=4_102_444_800,
        )
    )

    service.verify_advertisement_claim_token(
        public_id=public_id,
        claim_token=token,
    )


def test_tampered_advertisement_claim_token_is_rejected(
    monkeypatch,
) -> None:
    configure_media_settings(
        monkeypatch
    )

    service = MediaService(
        AsyncMock()
    )

    public_id = (
        "homelink/advertisements/"
        f"{uuid4().hex}/"
        f"{uuid4().hex}"
    )

    token = (
        service
        ._create_advertisement_claim_token(
            public_id=public_id,
            expires_at=4_102_444_800,
        )
    )

    tampered_token = (
        f"{token[:-1]}"
        f"{'A' if token[-1] != 'A' else 'B'}"
    )

    with pytest.raises(
        HTTPException
    ) as error:
        service.verify_advertisement_claim_token(
            public_id=public_id,
            claim_token=tampered_token,
        )

    assert (
        error.value.status_code
        == 422
    )


def test_expired_advertisement_claim_token_is_rejected(
    monkeypatch,
) -> None:
    configure_media_settings(
        monkeypatch
    )

    service = MediaService(
        AsyncMock()
    )

    public_id = (
        "homelink/advertisements/"
        f"{uuid4().hex}/"
        f"{uuid4().hex}"
    )

    token = (
        service
        ._create_advertisement_claim_token(
            public_id=public_id,
            expires_at=1,
        )
    )

    with pytest.raises(
        HTTPException
    ) as error:
        service.verify_advertisement_claim_token(
            public_id=public_id,
            claim_token=token,
        )

    assert (
        error.value.status_code
        == 422
    )

    assert "expired" in str(
        error.value.detail
    ).lower()


def test_advertisement_payment_never_imports_credit_service(
) -> None:
    source = (
        ROOT
        / "app/services/"
        "advertisement_payment_service.py"
    ).read_text(
        encoding="utf-8"
    )

    assert (
        "CreditService"
        not in source
    )

    assert (
        "credit_quantity"
        not in source
    )

    assert (
        "ListingCreditBalance"
        not in source
    )


def test_advertisement_payment_does_not_start_campaign_timer(
) -> None:
    source = (
        ROOT
        / "app/services/"
        "advertisement_payment_service.py"
    ).read_text(
        encoding="utf-8"
    )

    assert (
        "advertisement.starts_at = None"
        in source
    )

    assert (
        "advertisement.ends_at = None"
        in source
    )

    assert (
        "AdvertisementStatus"
        in source
    )

    assert (
        ".PENDING_REVIEW"
        in source
    )


def test_shared_webhooks_dispatch_advertisement_references(
) -> None:
    source = (
        ROOT
        / "app/api/v1/endpoints/"
        "payments.py"
    ).read_text(
        encoding="utf-8"
    )

    assert (
        "AdvertisementWebhookService"
        in source
    )

    assert (
        "extract_paystack_reference"
        in source
    )

    assert (
        "extract_flutterwave_reference"
        in source
    )

    assert (
        "valid_paystack_signature"
        in source
    )

    assert (
        "valid_flutterwave_signature"
        in source
    )


def test_advertisement_webhook_prefix_is_separate(
) -> None:
    source = (
        ROOT
        / "app/services/"
        "advertisement_webhook_service.py"
    ).read_text(
        encoding="utf-8"
    )

    assert (
        'ADVERTISEMENT_PAYMENT_PREFIX = ('
        in source
    )

    assert (
        '"HLADPAY-"'
        in source
    )

    assert (
        "PaymentWebhookEvent"
        in source
    )