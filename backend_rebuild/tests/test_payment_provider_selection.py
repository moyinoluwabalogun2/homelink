import asyncio

from app.api.v1.endpoints import payments
from app.models.enums import PaymentProvider
from app.schemas.payment import (
    PaymentInitializeRequest,
)


def test_initialize_request_accepts_paystack(
) -> None:
    payload = PaymentInitializeRequest(
        plan_code="rental-one",
        provider="paystack",
    )

    assert (
        payload.provider
        is PaymentProvider.PAYSTACK
    )


def test_initialize_request_accepts_flutterwave(
) -> None:
    payload = PaymentInitializeRequest(
        plan_code="property-one",
        provider="flutterwave",
    )

    assert (
        payload.provider
        is PaymentProvider.FLUTTERWAVE
    )


def test_both_mode_exposes_paystack_first(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        payments.settings,
        "payment_provider",
        "both",
    )

    result = asyncio.run(
        payments.list_payment_providers(),
    )

    assert result.providers == [
        PaymentProvider.PAYSTACK,
        PaymentProvider.FLUTTERWAVE,
    ]

    assert (
        result.default_provider
        is PaymentProvider.PAYSTACK
    )


def test_single_paystack_mode(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        payments.settings,
        "payment_provider",
        "paystack",
    )

    result = asyncio.run(
        payments.list_payment_providers(),
    )

    assert result.providers == [
        PaymentProvider.PAYSTACK,
    ]

    assert (
        result.default_provider
        is PaymentProvider.PAYSTACK
    )


def test_single_flutterwave_mode(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        payments.settings,
        "payment_provider",
        "flutterwave",
    )

    result = asyncio.run(
        payments.list_payment_providers(),
    )

    assert result.providers == [
        PaymentProvider.FLUTTERWAVE,
    ]

    assert (
        result.default_provider
        is PaymentProvider.FLUTTERWAVE
    )


def test_disabled_mode_exposes_no_checkout(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        payments.settings,
        "payment_provider",
        "disabled",
    )

    result = asyncio.run(
        payments.list_payment_providers(),
    )

    assert result.providers == []

    assert (
        result.default_provider
        is None
    )