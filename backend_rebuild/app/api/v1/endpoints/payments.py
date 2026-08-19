from fastapi import APIRouter, HTTPException, Request

from app.api.auth_dependencies import CurrentUser
from app.api.dependencies import DbSession
from app.core.config import get_settings
from app.schemas.payment import (
    CreditBalanceRead,
    PaymentInitializeRequest,
    PaymentInitializeResponse,
    PaymentPlanRead,
    PaymentRead,
)
from app.services.payment_service import PaymentService


router = APIRouter(prefix="/payments", tags=["payments"])
settings = get_settings()


@router.get("/plans", response_model=list[PaymentPlanRead])
async def list_payment_plans(session: DbSession) -> list[PaymentPlanRead]:
    records = await PaymentService(session).list_plans()
    return [PaymentPlanRead.model_validate(item) for item in records]


@router.get("/credits/me", response_model=list[CreditBalanceRead])
async def list_my_credits(
    session: DbSession,
    current_user: CurrentUser,
) -> list[CreditBalanceRead]:
    records = await PaymentService(session).list_credits(current_user)
    return [CreditBalanceRead.model_validate(item) for item in records]


@router.post("/initialize", response_model=PaymentInitializeResponse, status_code=201)
async def initialize_payment(
    payload: PaymentInitializeRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> PaymentInitializeResponse:
    payment = await PaymentService(session).initialize(
        user=current_user,
        plan_code=payload.plan_code,
    )
    if not payment.authorization_url:
        raise HTTPException(status_code=502, detail="Payment checkout URL is unavailable.")
    return PaymentInitializeResponse(
        payment=PaymentRead.model_validate(payment),
        authorization_url=payment.authorization_url,
    )


@router.post("/paystack/webhook", status_code=200)
async def paystack_webhook(request: Request, session: DbSession) -> dict[str, bool]:
    if settings.payment_provider != "paystack":
        raise HTTPException(status_code=404, detail="Paystack webhook is unavailable.")
    raw_body = await request.body()
    signature = request.headers.get("x-paystack-signature")
    service = PaymentService(session)
    if not service.valid_paystack_signature(raw_body, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")
    await service.process_paystack_webhook(raw_body)
    return {"received": True}


@router.post("/mock/{reference}/complete", response_model=PaymentRead)
async def complete_mock_payment(
    reference: str,
    session: DbSession,
    current_user: CurrentUser,
) -> PaymentRead:
    payment = await PaymentService(session).complete_mock(
        reference=reference,
        user=current_user,
    )
    return PaymentRead.model_validate(payment)


@router.post("/{reference}/verify", response_model=PaymentRead)
async def verify_payment(
    reference: str,
    session: DbSession,
    current_user: CurrentUser,
) -> PaymentRead:
    payment = await PaymentService(session).verify(
        reference=reference,
        user=current_user,
    )
    return PaymentRead.model_validate(payment)


@router.get("/{reference}", response_model=PaymentRead)
async def get_payment(
    reference: str,
    session: DbSession,
    current_user: CurrentUser,
) -> PaymentRead:
    payment = await PaymentService(session).get_payment(
        reference=reference,
        user=current_user,
    )
    return PaymentRead.model_validate(payment)