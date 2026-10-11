from __future__ import annotations

from fastapi import (
    APIRouter,
    HTTPException,
    Request,
)

from app.api.dependencies import (
    DbSession,
    RedisClient,
)
from app.core.rate_limit import (
    fingerprint,
    get_client_ip,
    protect_endpoint,
)
from app.schemas.advertisement_payment import (
    AdvertisementPaymentInitializeRequest,
    AdvertisementPaymentInitializeResponse,
    AdvertisementPaymentRead,
    AdvertisementPaymentVerifyRequest,
)
from app.services.advertisement_payment_service import (
    AdvertisementPaymentService,
)


router = APIRouter(
    prefix="/advertisement-payments",
    tags=[
        "advertisement-payments",
    ],
)


@router.post(
    "/initialize",
    response_model=(
        AdvertisementPaymentInitializeResponse
    ),
    status_code=201,
)
async def initialize_advertisement_payment(
    payload: AdvertisementPaymentInitializeRequest,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> AdvertisementPaymentInitializeResponse:
    """
    Initialize a real Paystack or Flutterwave checkout for an
    advertisement.

    The private management token proves access to the advert.
    No HomeLink account or listing credit is required.
    """

    client_ip = get_client_ip(
        request
    )

    token_fingerprint = fingerprint(
        payload.management_token
    )

    await protect_endpoint(
        redis,
        key=(
            "advertisement-payment-initialize:"
            f"ip:{fingerprint(client_ip)}:"
            f"token:{token_fingerprint}"
        ),
        limit=8,
        window_seconds=10 * 60,
        unavailable_message=(
            "Advertisement payment protection "
            "is temporarily unavailable."
        ),
    )

    payment = (
        await AdvertisementPaymentService(
            session
        ).initialize(
            management_token=(
                payload.management_token
            ),
            requested_provider=(
                payload.provider
            ),
        )
    )

    if not payment.authorization_url:
        raise HTTPException(
            status_code=502,
            detail=(
                "Advertisement checkout URL "
                "is unavailable."
            ),
        )

    return (
        AdvertisementPaymentInitializeResponse(
            payment=(
                AdvertisementPaymentRead
                .model_validate(
                    payment
                )
            ),
            authorization_url=(
                payment.authorization_url
            ),
        )
    )


@router.post(
    "/verify",
    response_model=(
        AdvertisementPaymentRead
    ),
)
async def verify_advertisement_payment(
    payload: AdvertisementPaymentVerifyRequest,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> AdvertisementPaymentRead:
    """
    Verify an advert payment directly with Paystack or
    Flutterwave after the customer returns from checkout.
    """

    client_ip = get_client_ip(
        request
    )

    token_fingerprint = fingerprint(
        payload.management_token
    )

    reference_fingerprint = fingerprint(
        payload.reference
    )

    await protect_endpoint(
        redis,
        key=(
            "advertisement-payment-verify:"
            f"ip:{fingerprint(client_ip)}:"
            f"token:{token_fingerprint}:"
            f"reference:{reference_fingerprint}"
        ),
        limit=20,
        window_seconds=10 * 60,
        unavailable_message=(
            "Advertisement payment verification "
            "is temporarily unavailable."
        ),
    )

    payment = (
        await AdvertisementPaymentService(
            session
        ).verify(
            reference=payload.reference,
            management_token=(
                payload.management_token
            ),
        )
    )

    return (
        AdvertisementPaymentRead
        .model_validate(
            payment
        )
    )


@router.post(
    "/status",
    response_model=(
        AdvertisementPaymentRead
    ),
)
async def get_advertisement_payment_status(
    payload: AdvertisementPaymentVerifyRequest,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> AdvertisementPaymentRead:
    """
    Read the locally recorded status without contacting the
    payment provider.

    This is useful for the advertiser management screen.
    """

    client_ip = get_client_ip(
        request
    )

    token_fingerprint = fingerprint(
        payload.management_token
    )

    reference_fingerprint = fingerprint(
        payload.reference
    )

    await protect_endpoint(
        redis,
        key=(
            "advertisement-payment-status:"
            f"ip:{fingerprint(client_ip)}:"
            f"token:{token_fingerprint}:"
            f"reference:{reference_fingerprint}"
        ),
        limit=60,
        window_seconds=10 * 60,
        unavailable_message=(
            "Advertisement payment status "
            "is temporarily unavailable."
        ),
    )

    payment = (
        await AdvertisementPaymentService(
            session
        ).get_payment(
            reference=payload.reference,
            management_token=(
                payload.management_token
            ),
        )
    )

    return (
        AdvertisementPaymentRead
        .model_validate(
            payment
        )
    )


@router.post(
    "/mock/complete",
    response_model=(
        AdvertisementPaymentRead
    ),
)
async def complete_mock_advertisement_payment(
    payload: AdvertisementPaymentVerifyRequest,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> AdvertisementPaymentRead:
    """
    Local-development helper.

    AdvertisementPaymentService rejects this endpoint whenever
    ENVIRONMENT is production or PAYMENT_PROVIDER is not mock.
    """

    client_ip = get_client_ip(
        request
    )

    await protect_endpoint(
        redis,
        key=(
            "advertisement-payment-mock:"
            f"ip:{fingerprint(client_ip)}"
        ),
        limit=10,
        window_seconds=10 * 60,
        unavailable_message=(
            "Mock payment protection "
            "is temporarily unavailable."
        ),
    )

    payment = (
        await AdvertisementPaymentService(
            session
        ).complete_mock(
            reference=payload.reference,
            management_token=(
                payload.management_token
            ),
        )
    )

    return (
        AdvertisementPaymentRead
        .model_validate(
            payment
        )
    )