from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from hashlib import sha256
import base64
import hmac
import json
from uuid import uuid4

from fastapi import HTTPException
import httpx
from sqlalchemy import select, update
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
        self.credits = CreditService(session)
        self.notifications = NotificationService(
            session,
        )

    # =========================================================
    # PLANS / BALANCES / HISTORY
    # =========================================================

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

        return list(result.all())

    async def list_credits(
        self,
        user: User,
    ):
        return await self.credits.list_balances(
            user.id,
        )

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
                Payment.user_id == user.id,
            )
            .order_by(
                Payment.created_at.desc(),
            )
            .limit(limit)
            .offset(offset)
        )

        return list(result.all())

    # =========================================================
    # INITIALIZE PAYMENT
    # =========================================================

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
                    "Payments are currently disabled."
                ),
            )

        plan = await self.session.scalar(
            select(PaymentPlan).where(
                PaymentPlan.code == plan_code,
                PaymentPlan.is_active.is_(True),
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
            status=PaymentStatus.PENDING,
            amount_kobo=plan.amount_kobo,
            currency=plan.currency,
        )

        self.session.add(
            payment,
        )

        await self.session.flush()

        # -----------------------------------------------------
        # MOCK
        # -----------------------------------------------------

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
            # -------------------------------------------------
            # PAYSTACK
            # -------------------------------------------------

            if (
                provider
                == PaymentProvider.PAYSTACK
            ):
                await self._initialize_paystack(
                    payment=payment,
                    user=user,
                    plan=plan,
                )

            # -------------------------------------------------
            # FLUTTERWAVE
            # -------------------------------------------------

            elif (
                provider
                == PaymentProvider.FLUTTERWAVE
            ):
                await self._initialize_flutterwave(
                    payment=payment,
                    user=user,
                    plan=plan,
                )

            else:
                raise RuntimeError(
                    "Unsupported payment provider."
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
                    "Payment initialization failed. "
                    "Please try again."
                ),
            ) from exc

    # =========================================================
    # PAYSTACK INITIALIZATION
    # =========================================================

    async def _initialize_paystack(
        self,
        *,
        payment: Payment,
        user: User,
        plan: PaymentPlan,
    ) -> None:
        payload = {
            "email": user.email,
            "amount": plan.amount_kobo,
            "currency": plan.currency,
            "reference": payment.reference,
            "callback_url": (
                settings.payment_callback_url
            ),
            "metadata": {
                "payment_id": str(
                    payment.id,
                ),
                "plan_code": plan.code,
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
                "Paystack initialization returned "
                "an invalid response."
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

        payment.provider_metadata = body

    # =========================================================
    # FLUTTERWAVE INITIALIZATION
    # =========================================================

    async def _initialize_flutterwave(
        self,
        *,
        payment: Payment,
        user: User,
        plan: PaymentPlan,
    ) -> None:
        amount = (
            Decimal(
                plan.amount_kobo,
            )
            / Decimal("100")
        ).quantize(
            Decimal("0.01"),
        )

        payload = {
            "tx_ref": payment.reference,
            "amount": format(
                amount,
                ".2f",
            ),
            "currency": plan.currency,
            "redirect_url": (
                settings.payment_callback_url
            ),
            "customer": {
                "email": user.email,
            },
            "customizations": {
                "title": "HomeLink",
                "description": plan.name,
            },
            "meta": {
                "payment_id": str(
                    payment.id,
                ),
                "plan_code": plan.code,
                "user_id": str(
                    user.id,
                ),
            },
            "configurations": {
                "session_duration": 15,
                "max_retry_attempt": 5,
            },
        }

        async with httpx.AsyncClient(
            timeout=20.0,
        ) as client:
            response = await client.post(
                (
                    f"{settings.flutterwave_base_url}"
                    "/payments"
                ),
                headers={
                    "Authorization": (
                        "Bearer "
                        f"{settings.flutterwave_secret_key}"
                    ),
                    "Content-Type": (
                        "application/json"
                    ),
                },
                json=payload,
            )

            response.raise_for_status()

            body = response.json()

        data = body.get(
            "data",
        ) or {}

        if (
            body.get("status") != "success"
            or not data.get("link")
        ):
            raise RuntimeError(
                "Flutterwave initialization returned "
                "an invalid response."
            )

        payment.authorization_url = (
            data["link"]
        )

        payment.provider_metadata = body

    # =========================================================
    # GET PAYMENT
    # =========================================================

    async def get_payment(
        self,
        *,
        reference: str,
        user: User,
    ) -> Payment:
        payment = await self.session.scalar(
            select(Payment).where(
                Payment.reference == reference,
                Payment.user_id == user.id,
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

    # =========================================================
    # MOCK COMPLETION
    # =========================================================

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
            await self
            ._get_payment_for_update(
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

    # =========================================================
    # VERIFY PAYMENT
    # =========================================================

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

        # Already fulfilled.
        # Do not call the provider again.
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

        if (
            payment.provider
            == PaymentProvider.PAYSTACK
        ):
            await self._verify_paystack(
                payment,
            )

        elif (
            payment.provider
            == PaymentProvider.FLUTTERWAVE
        ):
            await self._verify_flutterwave(
                payment,
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported payment provider."
                ),
            )

        await self.session.commit()

        return await self.get_payment(
            reference=reference,
            user=user,
        )

    # =========================================================
    # PAYSTACK VERIFICATION
    # =========================================================

    async def _verify_paystack(
        self,
        payment: Payment,
    ) -> None:
        try:
            async with httpx.AsyncClient(
                timeout=20.0,
            ) as client:
                response = await client.get(
                    (
                        f"{settings.paystack_base_url}"
                        "/transaction/verify/"
                        f"{payment.reference}"
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

        data = body.get(
            "data",
        ) or {}

        provider_status = str(
            data.get(
                "status",
                "",
            ),
        ).lower()

        if (
            provider_status
            == "success"
        ):
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
                await self
                ._get_payment_for_update(
                    payment.reference,
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

            return

        status_map = {
            "abandoned":
                PaymentStatus.ABANDONED,
            "failed":
                PaymentStatus.FAILED,
            "reversed":
                PaymentStatus.REFUNDED,
        }

        new_status = status_map.get(
            provider_status,
            PaymentStatus.PENDING,
        )

        locked = (
            await self
            ._get_payment_for_update(
                payment.reference,
            )
        )

        if (
            locked.status
            != PaymentStatus.SUCCESS
        ):
            locked.status = new_status
            locked.provider_metadata = body

            if data.get("id"):
                locked.provider_transaction_id = (
                    str(
                        data["id"],
                    )
                )

    # =========================================================
    # FLUTTERWAVE VERIFICATION
    # =========================================================

    async def _verify_flutterwave(
        self,
        payment: Payment,
    ) -> None:
        body = (
            await self
            ._fetch_flutterwave_by_reference(
                payment.reference,
            )
        )

        data = body.get(
            "data",
        ) or {}

        # -----------------------------------------------------
        # Reference MUST match our HL reference
        # -----------------------------------------------------

        if (
            str(
                data.get(
                    "tx_ref",
                    "",
                ),
            )
            != payment.reference
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Payment reference mismatch."
                ),
            )

        provider_status = str(
            data.get(
                "status",
                "",
            ),
        ).lower()

        # -----------------------------------------------------
        # SUCCESS
        # -----------------------------------------------------

        if (
            provider_status
            == "successful"
        ):
            expected_amount = (
                Decimal(
                    payment.amount_kobo,
                )
                / Decimal("100")
            ).quantize(
                Decimal("0.01"),
            )

            try:
                actual_amount = Decimal(
                    str(
                        data.get(
                            "amount",
                        ),
                    ),
                ).quantize(
                    Decimal("0.01"),
                )

            except (
                InvalidOperation,
                TypeError,
                ValueError,
            ) as exc:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Invalid payment amount."
                    ),
                ) from exc

            # HomeLink requires exact payment.
            if (
                actual_amount
                != expected_amount
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
                await self
                ._get_payment_for_update(
                    payment.reference,
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

            return

        # -----------------------------------------------------
        # NON-SUCCESS
        # No credit is ever granted.
        # -----------------------------------------------------

        status_map = {
            "failed":
                PaymentStatus.FAILED,
            "cancelled":
                PaymentStatus.ABANDONED,
            "canceled":
                PaymentStatus.ABANDONED,
            "reversed":
                PaymentStatus.REFUNDED,
        }

        new_status = status_map.get(
            provider_status,
            PaymentStatus.PENDING,
        )

        locked = (
            await self
            ._get_payment_for_update(
                payment.reference,
            )
        )

        # Prevent a late stale response
        # overwriting webhook success.
        if (
            locked.status
            != PaymentStatus.SUCCESS
        ):
            locked.status = new_status
            locked.provider_metadata = body

            if data.get("id"):
                locked.provider_transaction_id = (
                    str(
                        data["id"],
                    )
                )

    # =========================================================
    # FLUTTERWAVE VERIFY BY REFERENCE
    # =========================================================

    async def _fetch_flutterwave_by_reference(
        self,
        reference: str,
    ) -> dict:
        try:
            async with httpx.AsyncClient(
                timeout=20.0,
            ) as client:
                response = await client.get(
                    (
                        f"{settings.flutterwave_base_url}"
                        "/transactions/"
                        "verify_by_reference"
                    ),
                    params={
                        "tx_ref": reference,
                    },
                    headers={
                        "Authorization": (
                            "Bearer "
                            f"{settings.flutterwave_secret_key}"
                        ),
                        "Content-Type": (
                            "application/json"
                        ),
                    },
                )

                response.raise_for_status()

                body = response.json()

        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Flutterwave verification is "
                    "temporarily unavailable."
                ),
            ) from exc

        if (
            body.get("status") != "success"
            or not body.get("data")
        ):
            raise HTTPException(
                status_code=502,
                detail=(
                    "Flutterwave returned an "
                    "invalid verification response."
                ),
            )

        return body

    # =========================================================
    # PAYSTACK WEBHOOK SIGNATURE
    # =========================================================

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

    # =========================================================
    # FLUTTERWAVE WEBHOOK SIGNATURE
    #
    # Supports both:
    # - current flutterwave-signature HMAC
    # - legacy v3 verif-hash
    # =========================================================

    @staticmethod
    def valid_flutterwave_signature(
        raw_body: bytes,
        signature: str | None,
        legacy_hash: str | None = None,
    ) -> bool:
        secret = (
            settings.flutterwave_webhook_secret
        )

        if not secret:
            return False

        # Current Flutterwave webhook signature
        if signature:
            expected = base64.b64encode(
                hmac.new(
                    secret.encode(
                        "utf-8",
                    ),
                    raw_body,
                    "sha256",
                ).digest()
            ).decode(
                "utf-8",
            )

            if hmac.compare_digest(
                expected,
                signature,
            ):
                return True

        # Older Flutterwave v3 webhooks
        # may send the raw secret hash.
        if legacy_hash:
            return hmac.compare_digest(
                legacy_hash,
                secret,
            )

        return False

    # =========================================================
    # PAYSTACK WEBHOOK
    # =========================================================

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
            b"paystack:"
            + raw_body,
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
                payload.get(
                    "data",
                )
                or {}
            )

            reference = data.get(
                "reference",
            )

            if reference:
                payment = (
                    await self
                    ._get_payment_for_update(
                        str(
                            reference,
                        ),
                        required=False,
                    )
                )

                if (
                    payment is not None
                    and payment.provider
                    == PaymentProvider.PAYSTACK
                ):
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
                            provider_metadata=payload,
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

    # =========================================================
    # FLUTTERWAVE WEBHOOK
    # =========================================================

    async def process_flutterwave_webhook(
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
            b"flutterwave:"
            + raw_body,
        ).hexdigest()

        inserted = await self.session.scalar(
            insert(
                PaymentWebhookEvent,
            )
            .values(
                provider=(
                    PaymentProvider.FLUTTERWAVE
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

        data = (
            payload.get(
                "data",
            )
            or {}
        )

        reference = data.get(
            "tx_ref",
        )

        if reference:
            payment = await self.session.scalar(
                select(
                    Payment,
                ).where(
                    Payment.reference
                    == str(
                        reference,
                    ),
                    Payment.provider
                    == PaymentProvider.FLUTTERWAVE,
                )
            )

            if payment is not None:
                provider_status = str(
                    data.get(
                        "status",
                        "",
                    ),
                ).lower()

                # ---------------------------------------------
                # Successful webhook:
                # NEVER trust webhook amount alone.
                # Verify independently with Flutterwave.
                # ---------------------------------------------

                if (
                    event_type
                    == "charge.completed"
                    and provider_status
                    == "successful"
                ):
                    await self._verify_flutterwave(
                        payment,
                    )

                # ---------------------------------------------
                # Failure
                # ---------------------------------------------

                elif (
                    provider_status
                    == "failed"
                ):
                    locked = (
                        await self
                        ._get_payment_for_update(
                            payment.reference,
                        )
                    )

                    if (
                        locked.status
                        != PaymentStatus.SUCCESS
                    ):
                        locked.status = (
                            PaymentStatus.FAILED
                        )

                        locked.provider_metadata = (
                            payload
                        )

                        if data.get("id"):
                            locked.provider_transaction_id = (
                                str(
                                    data["id"],
                                )
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

    # =========================================================
    # PAYMENT LOCK
    # =========================================================

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

    # =========================================================
    # FULFIL PAYMENT
    # =========================================================

    async def _fulfil(
        self,
        payment: Payment,
        *,
        provider_transaction_id: str | None,
        provider_metadata: dict | None = None,
    ) -> None:
        """
        Claim and fulfil one payment exactly once.

        PostgreSQL is the idempotency barrier. Callback,
        retry and webhook requests may race, but only one
        request can transition this payment to SUCCESS.
        """

        now = datetime.now(
            UTC,
        )

        values: dict = {
            "status": PaymentStatus.SUCCESS,
            "paid_at": now,
            "provider_transaction_id":
                provider_transaction_id,
        }

        if provider_metadata is not None:
            values["provider_metadata"] = (
                provider_metadata
            )

        claimed_payment_id = await self.session.scalar(
            update(Payment)
            .where(
                Payment.id == payment.id,
                Payment.status.in_(
                    [
                        PaymentStatus.PENDING,
                        PaymentStatus.FAILED,
                        PaymentStatus.ABANDONED,
                    ]
                ),
            )
            .values(
                **values,
            )
            .returning(
                Payment.id,
            )
            .execution_options(
                synchronize_session=False,
            )
        )

        # Another request already fulfilled this payment,
        # so NEVER add the credits again.
        if claimed_payment_id is None:
            return

        await self.credits.grant_paid_credits(
            user_id=payment.user_id,
            plan=payment.plan,
        )

        payment.status = (
            PaymentStatus.SUCCESS
        )

        payment.paid_at = now

        payment.provider_transaction_id = (
            provider_transaction_id
        )

        if provider_metadata is not None:
            payment.provider_metadata = (
                provider_metadata
            )

        quantity = (
            payment.plan.credit_quantity
        )

        credit_word = (
            "credit"
            if quantity == 1
            else "credits"
        )

        self.notifications.create(
            user_id=payment.user_id,
            notification_type=(
                NotificationType.PAYMENT_SUCCESS
            ),
            title="Payment successful",
            message=(
                f"Your payment for "
                f"{payment.plan.name} "
                f"was successful. "
                f"{quantity} posting "
                f"{credit_word} "
                f"{'was' if quantity == 1 else 'were'} "
                f"added."
            ),
            data={
                "payment_reference":
                    payment.reference,
            },
        )