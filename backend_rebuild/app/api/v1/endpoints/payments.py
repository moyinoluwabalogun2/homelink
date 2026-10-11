from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Request,
)

from app.api.auth_dependencies import (
    CurrentUser,
)
from app.api.dependencies import (
    DbSession,
    RedisClient,
)
from app.core.config import get_settings
from app.core.rate_limit import (
    protect_endpoint,
)
from app.models.enums import (
    PaymentProvider,
)
from app.schemas.payment import (
    CreditBalanceRead,
    PaymentInitializeRequest,
    PaymentInitializeResponse,
    PaymentPlanRead,
    PaymentProvidersRead,
    PaymentRead,
)
from app.services.advertisement_webhook_service import (
    AdvertisementWebhookService,
)
from app.services.payment_service import (
    PaymentService,
)


router = APIRouter(
    prefix="/payments",
    tags=[
        "payments",
    ],
)

settings = get_settings()


# ============================================================
# AVAILABLE PAYMENT PROVIDERS
# ============================================================


@router.get(
    "/providers",
    response_model=(
        PaymentProvidersRead
    ),
)
async def list_payment_providers(
) -> PaymentProvidersRead:
    configured = (
        settings.payment_provider
    )

    if configured == "disabled":
        providers: list[
            PaymentProvider
        ] = []

    elif configured == "both":
        providers = [
            PaymentProvider.PAYSTACK,
            PaymentProvider.FLUTTERWAVE,
        ]

    else:
        providers = [
            PaymentProvider(
                configured
            ),
        ]

    return PaymentProvidersRead(
        providers=providers,
        default_provider=(
            providers[0]
            if providers
            else None
        ),
    )


# ============================================================
# PAYMENT PLANS
# ============================================================


@router.get(
    "/plans",
    response_model=list[
        PaymentPlanRead
    ],
)
async def list_payment_plans(
    session: DbSession,
) -> list[PaymentPlanRead]:
    records = await PaymentService(
        session
    ).list_plans()

    return [
        PaymentPlanRead.model_validate(
            item
        )
        for item in records
    ]


# ============================================================
# USER CREDIT BALANCES
# ============================================================


@router.get(
    "/credits/me",
    response_model=list[
        CreditBalanceRead
    ],
)
async def list_my_credits(
    session: DbSession,
    current_user: CurrentUser,
) -> list[CreditBalanceRead]:
    records = await PaymentService(
        session
    ).list_credits(
        current_user
    )

    return [
        CreditBalanceRead.model_validate(
            item
        )
        for item in records
    ]


# ============================================================
# INITIALIZE LISTING-CREDIT PAYMENT
# ============================================================


@router.post(
    "/initialize",
    response_model=(
        PaymentInitializeResponse
    ),
    status_code=201,
)
async def initialize_payment(
    payload: PaymentInitializeRequest,
    session: DbSession,
    redis: RedisClient,
    current_user: CurrentUser,
) -> PaymentInitializeResponse:
    await protect_endpoint(
        redis,
        key=(
            "payment-initialize:"
            f"user:{current_user.id}"
        ),
        limit=10,
        window_seconds=600,
        unavailable_message=(
            "Payment protection is "
            "temporarily unavailable."
        ),
    )

    payment = await PaymentService(
        session
    ).initialize(
        user=current_user,
        plan_code=(
            payload.plan_code
        ),
        requested_provider=(
            payload.provider
        ),
    )

    if not payment.authorization_url:
        raise HTTPException(
            status_code=502,
            detail=(
                "Payment checkout URL "
                "is unavailable."
            ),
        )

    return PaymentInitializeResponse(
        payment=(
            PaymentRead.model_validate(
                payment
            )
        ),
        authorization_url=(
            payment.authorization_url
        ),
    )


# ============================================================
# PAYSTACK WEBHOOK
#
# One signed endpoint receives both:
#
# - normal HomeLink credit payments
# - sponsored advertisement payments
#
# Signature validation always happens before dispatch.
# ============================================================


@router.post(
    "/paystack/webhook",
    status_code=200,
)
async def paystack_webhook(
    request: Request,
    session: DbSession,
) -> dict[str, bool]:
    if (
        settings.payment_provider
        not in {
            "paystack",
            "both",
        }
    ):
        raise HTTPException(
            status_code=404,
            detail=(
                "Paystack webhook "
                "is unavailable."
            ),
        )

    raw_body = await request.body()

    signature = request.headers.get(
        "x-paystack-signature"
    )

    payment_service = PaymentService(
        session
    )

    if not (
        payment_service
        .valid_paystack_signature(
            raw_body,
            signature,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid Paystack "
                "webhook signature."
            ),
        )

    advertisement_webhooks = (
        AdvertisementWebhookService(
            session
        )
    )

    advertisement_reference = (
        advertisement_webhooks
        .extract_paystack_reference(
            raw_body
        )
    )

    if advertisement_reference:
        await advertisement_webhooks.process_paystack_webhook(
            raw_body
        )

    else:
        await payment_service.process_paystack_webhook(
            raw_body
        )

    return {
        "received": True,
    }


# ============================================================
# FLUTTERWAVE WEBHOOK
#
# One signed endpoint receives both credit and advert payments.
# The reference prefix selects exactly one ledger.
# ============================================================


@router.post(
    "/flutterwave/webhook",
    status_code=200,
)
async def flutterwave_webhook(
    request: Request,
    session: DbSession,
) -> dict[str, bool]:
    if (
        settings.payment_provider
        not in {
            "flutterwave",
            "both",
        }
    ):
        raise HTTPException(
            status_code=404,
            detail=(
                "Flutterwave webhook "
                "is unavailable."
            ),
        )

    raw_body = await request.body()

    # Current Flutterwave HMAC header.
    signature = request.headers.get(
        "flutterwave-signature"
    )

    # Flutterwave v3 secret-hash header.
    legacy_hash = request.headers.get(
        "verif-hash"
    )

    payment_service = PaymentService(
        session
    )

    if not (
        payment_service
        .valid_flutterwave_signature(
            raw_body,
            signature,
            legacy_hash,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid Flutterwave "
                "webhook signature."
            ),
        )

    advertisement_webhooks = (
        AdvertisementWebhookService(
            session
        )
    )

    advertisement_reference = (
        advertisement_webhooks
        .extract_flutterwave_reference(
            raw_body
        )
    )

    if advertisement_reference:
        await advertisement_webhooks.process_flutterwave_webhook(
            raw_body
        )

    else:
        await payment_service.process_flutterwave_webhook(
            raw_body
        )

    return {
        "received": True,
    }


# ============================================================
# MOCK LISTING-CREDIT PAYMENT COMPLETION
#
# PaymentService rejects this in production.
# ============================================================


@router.post(
    "/mock/{reference}/complete",
    response_model=PaymentRead,
)
async def complete_mock_payment(
    reference: str,
    session: DbSession,
    current_user: CurrentUser,
) -> PaymentRead:
    payment = await PaymentService(
        session
    ).complete_mock(
        reference=reference,
        user=current_user,
    )

    return PaymentRead.model_validate(
        payment
    )


# ============================================================
# PAYMENT HISTORY
#
# Keep this route above the dynamic reference routes.
# Otherwise FastAPI may interpret "history" as a reference.
# ============================================================


@router.get(
    "/history",
    response_model=list[
        PaymentRead
    ],
)
async def payment_history(
    session: DbSession,
    current_user: CurrentUser,
    limit: int = Query(
        default=20,
        ge=1,
        le=50,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
) -> list[PaymentRead]:
    records = await PaymentService(
        session
    ).list_payments(
        user=current_user,
        limit=limit,
        offset=offset,
    )

    return [
        PaymentRead.model_validate(
            item
        )
        for item in records
    ]


# ============================================================
# VERIFY LISTING-CREDIT PAYMENT
# ============================================================


@router.post(
    "/{reference}/verify",
    response_model=PaymentRead,
)
async def verify_payment(
    reference: str,
    session: DbSession,
    current_user: CurrentUser,
) -> PaymentRead:
    payment = await PaymentService(
        session
    ).verify(
        reference=reference,
        user=current_user,
    )

    return PaymentRead.model_validate(
        payment
    )


# ============================================================
# GET SINGLE LISTING-CREDIT PAYMENT
#
# Keep this route last because it contains a dynamic path.
# ============================================================


@router.get(
    "/{reference}",
    response_model=PaymentRead,
)
async def get_payment(
    reference: str,
    session: DbSession,
    current_user: CurrentUser,
) -> PaymentRead:
    payment = await PaymentService(
        session
    ).get_payment(
        reference=reference,
        user=current_user,
    )

    return PaymentRead.model_validate(
        payment
    )