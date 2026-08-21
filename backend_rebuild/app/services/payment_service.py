from datetime import UTC, datetime
from hashlib import sha256
import hmac
import json
from uuid import uuid4

from fastapi import HTTPException
import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.enums import (
    NotificationType,
    PaymentProvider,
    PaymentStatus,
)
from app.models.payment import (
    Payment,
    PaymentPlan,
    PaymentWebhookEvent,
)
from app.models.user import User
from app.services.credit_service import CreditService
from app.services.notification_service import (
    NotificationService,
)


settings = get_settings()


class PaymentService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

        self.credits = CreditService(
            session,
        )

        self.notifications = (
            NotificationService(
                session,
            )
        )

    async def list_plans(
        self,
    ) -> list[PaymentPlan]:
        result = await self.session.scalars(
            select(PaymentPlan)
            .where(
                PaymentPlan.is_active.is_(
                    True,
                ),
            )
            .order_by(
                PaymentPlan.sort_order,
                PaymentPlan.amount_kobo,
            )
        )

        return list(
            result.all(),
        )

    async def list_credits(
        self,
        user: User,
    ):
        balances = (
            await self.credits.list_balances(
                user.id,
            )
        )

        await self.session.commit()

        return balances

    async def list_payments(
        self,
        *,
        user: User,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Payment]:
        result = await self.session.scalars(
            select(Payment)
            .where(
                Payment.user_id
                == user.id,
            )
            .order_by(
                Payment.created_at.desc(),
            )
            .limit(
                limit,
            )
            .offset(
                offset,
            )
        )

        return list(
            result.all(),
        )

    async def initialize(
        self,
        *,
        user: User,
        plan_code: str,
    ) -> Payment:
        if (
            settings.payment_provider
            == "disabled"
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Payments are currently "
                    "disabled."
                ),
            )

        plan = await self.session.scalar(
            select(PaymentPlan).where(
                PaymentPlan.code
                == plan_code,
                PaymentPlan.is_active.is_(
                    True,
                ),
            )
        )

        if plan is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Payment plan not found."
                ),
            )

        provider = PaymentProvider(
            settings.payment_provider,
        )

        reference = (
            f"HL-{uuid4().hex.upper()}"
        )

        payment = Payment(
            user_id=user.id,
            plan_id=plan.id,
            reference=reference,
            provider=provider,
            status=(
                PaymentStatus.PENDING
            ),
            amount_kobo=(
                plan.amount_kobo
            ),
            currency=plan.currency,
        )

        self.session.add(
            payment,
        )

        await self.session.flush()

        if (
            provider
            == PaymentProvider.MOCK
        ):
            payment.authorization_url = (
                f"{settings.frontend_url}"
                f"/payment/mock"
                f"?reference={reference}"
            )

            await self.session.commit()

            return await self.get_payment(
                reference=reference,
                user=user,
            )

        try:
            payload = {
                "email": user.email,
                "amount": (
                    plan.amount_kobo
                ),
                "currency": (
                    plan.currency
                ),
                "reference": (
                    reference
                ),
                "callback_url": (
                    settings
                    .payment_callback_url
                ),
                "metadata": {
                    "payment_id": str(
                        payment.id,
                    ),
                    "plan_code": (
                        plan.code
                    ),
                    "user_id": str(
                        user.id,
                    ),
                },
            }

            async with httpx.AsyncClient(
                timeout=20.0,
            ) as client:
                response = await client.post(
                    (
                        f"{settings.paystack_base_url}"
                        "/transaction/initialize"
                    ),
                    headers={
                        "Authorization": (
                            "Bearer "
                            f"{settings.paystack_secret_key}"
                        ),
                        "Content-Type": (
                            "application/json"
                        ),
                    },
                    json=payload,
                )

                response.raise_for_status()

                body = response.json()

            if (
                not body.get("status")
                or not body.get("data")
            ):
                raise RuntimeError(
                    "Paystack initialization "
                    "returned an invalid response."
                )

            payment.authorization_url = (
                body["data"][
                    "authorization_url"
                ]
            )

            payment.access_code = (
                body["data"].get(
                    "access_code",
                )
            )

            payment.provider_metadata = (
                body
            )

            await self.session.commit()

            return await self.get_payment(
                reference=reference,
                user=user,
            )

        except Exception as exc:
            payment.status = (
                PaymentStatus.FAILED
            )

            payment.provider_metadata = {
                "initialization_error": str(
                    exc,
                ),
            }

            await self.session.commit()

            raise HTTPException(
                status_code=502,
                detail=(
                    "Payment initialization "
                    "failed. Please try again."
                ),
            ) from exc

    async def get_payment(
        self,
        *,
        reference: str,
        user: User,
    ) -> Payment:
        payment = await self.session.scalar(
            select(Payment).where(
                Payment.reference
                == reference,
                Payment.user_id
                == user.id,
            )
        )

        if payment is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Payment not found."
                ),
            )

        return payment

    async def complete_mock(
        self,
        *,
        reference: str,
        user: User,
    ) -> Payment:
        if (
            settings.environment
            == "production"
            or settings.payment_provider
            != "mock"
        ):
            raise HTTPException(
                status_code=404,
                detail=(
                    "Mock payment route "
                    "is unavailable."
                ),
            )

        payment = (
            await self._get_payment_for_update(
                reference,
            )
        )

        if payment.user_id != user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "This payment does not "
                    "belong to you."
                ),
            )

        await self._fulfil(
            payment,
            provider_transaction_id=(
                f"mock-{payment.reference}"
            ),
        )

        await self.session.commit()

        return await self.get_payment(
            reference=reference,
            user=user,
        )

    async def verify(
        self,
        *,
        reference: str,
        user: User,
    ) -> Payment:
        payment = await self.get_payment(
            reference=reference,
            user=user,
        )

        if (
            payment.status
            == PaymentStatus.SUCCESS
        ):
            return payment

        if (
            payment.provider
            == PaymentProvider.MOCK
        ):
            return payment

        try:
            async with httpx.AsyncClient(
                timeout=20.0,
            ) as client:
                response = await client.get(
                    (
                        f"{settings.paystack_base_url}"
                        "/transaction/verify/"
                        f"{reference}"
                    ),
                    headers={
                        "Authorization": (
                            "Bearer "
                            f"{settings.paystack_secret_key}"
                        ),
                    },
                )

                response.raise_for_status()

                body = response.json()

        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Payment verification is "
                    "temporarily unavailable."
                ),
            ) from exc

        data = (
            body.get("data")
            or {}
        )

        if (
            data.get("status")
            != "success"
        ):
            return payment

        if (
            int(
                data.get(
                    "amount",
                    -1,
                ),
            )
            != payment.amount_kobo
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Payment amount mismatch."
                ),
            )

        if (
            str(
                data.get(
                    "currency",
                    "",
                ),
            ).upper()
            != payment.currency.upper()
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Payment currency mismatch."
                ),
            )

        locked = (
            await self._get_payment_for_update(
                reference,
            )
        )

        await self._fulfil(
            locked,
            provider_transaction_id=(
                str(
                    data.get("id"),
                )
                if data.get("id")
                else None
            ),
            provider_metadata=body,
        )

        await self.session.commit()

        return await self.get_payment(
            reference=reference,
            user=user,
        )

    @staticmethod
    def valid_paystack_signature(
        raw_body: bytes,
        signature: str | None,
    ) -> bool:
        if (
            not signature
            or not settings.paystack_secret_key
        ):
            return False

        expected = hmac.new(
            settings.paystack_secret_key.encode(
                "utf-8",
            ),
            raw_body,
            "sha512",
        ).hexdigest()

        return hmac.compare_digest(
            expected,
            signature,
        )

    async def process_paystack_webhook(
        self,
        raw_body: bytes,
    ) -> None:
        payload = json.loads(
            raw_body.decode(
                "utf-8",
            ),
        )

        event_type = str(
            payload.get(
                "event",
                "unknown",
            ),
        )

        event_key = sha256(
            raw_body,
        ).hexdigest()

        inserted = await self.session.scalar(
            insert(
                PaymentWebhookEvent,
            )
            .values(
                provider=(
                    PaymentProvider.PAYSTACK
                ),
                event_key=event_key,
                event_type=event_type,
                payload=payload,
            )
            .on_conflict_do_nothing(
                index_elements=[
                    "event_key",
                ],
            )
            .returning(
                PaymentWebhookEvent.id,
            )
        )

        if inserted is None:
            return

        if (
            event_type
            == "charge.success"
        ):
            data = (
                payload.get("data")
                or {}
            )

            reference = data.get(
                "reference",
            )

            if reference:
                payment = (
                    await self
                    ._get_payment_for_update(
                        str(reference),
                        required=False,
                    )
                )

                if payment is not None:
                    amount_matches = (
                        int(
                            data.get(
                                "amount",
                                -1,
                            ),
                        )
                        == payment.amount_kobo
                    )

                    currency_matches = (
                        str(
                            data.get(
                                "currency",
                                "",
                            ),
                        ).upper()
                        == payment.currency.upper()
                    )

                    if (
                        amount_matches
                        and currency_matches
                    ):
                        await self._fulfil(
                            payment,
                            provider_transaction_id=(
                                str(
                                    data.get(
                                        "id",
                                    ),
                                )
                                if data.get(
                                    "id",
                                )
                                else None
                            ),
                            provider_metadata=(
                                payload
                            ),
                        )

        event = await self.session.get(
            PaymentWebhookEvent,
            inserted,
        )

        if event is not None:
            event.processed_at = (
                datetime.now(
                    UTC,
                )
            )

        await self.session.commit()

    async def _get_payment_for_update(
        self,
        reference: str,
        required: bool = True,
    ) -> Payment | None:
        payment = await self.session.scalar(
            select(Payment)
            .where(
                Payment.reference
                == reference,
            )
            .with_for_update()
        )

        if (
            payment is None
            and required
        ):
            raise HTTPException(
                status_code=404,
                detail=(
                    "Payment not found."
                ),
            )

        return payment

    async def _fulfil(
        self,
        payment: Payment,
        *,
        provider_transaction_id:
            str | None,
        provider_metadata:
            dict | None = None,
    ) -> None:
        if (
            payment.status
            == PaymentStatus.SUCCESS
        ):
            return

        await self.credits.grant_paid_credits(
            user_id=payment.user_id,
            plan=payment.plan,
        )

        payment.status = (
            PaymentStatus.SUCCESS
        )

        payment.paid_at = (
            datetime.now(
                UTC,
            )
        )

        payment.provider_transaction_id = (
            provider_transaction_id
        )

        if (
            provider_metadata
            is not None
        ):
            payment.provider_metadata = (
                provider_metadata
            )

        self.notifications.create(
            user_id=payment.user_id,
            notification_type=(
                NotificationType
                .PAYMENT_SUCCESS
            ),
            title=(
                "Payment successful"
            ),
            message=(
                f"Your payment for "
                f"{payment.plan.name} "
                f"was successful. "
                f"{payment.plan.credit_quantity} "
                f"posting credits were added."
            ),
            data={
                "payment_reference":
                    payment.reference,
            },
        )