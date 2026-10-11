from __future__ import annotations

from datetime import UTC, datetime
from decimal import (
    Decimal,
    InvalidOperation,
)
from uuid import uuid4

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.core.config import get_settings
from app.models.advertising import (
    Advertisement,
    AdvertisementPayment,
)
from app.models.enums import (
    AdvertisementStatus,
    PaymentProvider,
    PaymentStatus,
)
from app.repositories.advertising_repository import (
    AdvertisingRepository,
)
from app.services.advertising_service import (
    AdvertisingService,
)


settings = get_settings()


class AdvertisementPaymentService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

        self.advertisements = (
            AdvertisingRepository(
                session
            )
        )

    async def initialize(
        self,
        *,
        management_token: str,
        requested_provider: (
            PaymentProvider
            | None
        ) = None,
    ) -> AdvertisementPayment:
        """
        Initialize a separate advertisement payment.

        No listing credit balance is read or modified.
        """

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

        advertisement = (
            await self._get_advertisement(
                management_token=(
                    management_token
                ),
                for_update=True,
            )
        )

        if advertisement.status not in {
            AdvertisementStatus
            .PAYMENT_PENDING,
        }:
            if (
                await self.advertisements
                .latest_successful_payment(
                    advertisement_id=(
                        advertisement.id
                    ),
                )
                is not None
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "This advertisement "
                        "has already been paid."
                    ),
                )

            raise HTTPException(
                status_code=409,
                detail=(
                    "Payment cannot be started "
                    "for this advertisement."
                ),
            )

        successful_payment = (
            await self.advertisements
            .latest_successful_payment(
                advertisement_id=(
                    advertisement.id
                ),
            )
        )

        if successful_payment is not None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This advertisement "
                    "has already been paid."
                ),
            )

        provider = self._choose_provider(
            requested_provider
        )

        reference = (
            "HLADPAY-"
            f"{uuid4().hex.upper()}"
        )

        payment = AdvertisementPayment(
            advertisement_id=(
                advertisement.id
            ),
            reference=reference,
            provider=provider,
            status=PaymentStatus.PENDING,
            amount_kobo=(
                advertisement.amount_kobo
            ),
            currency=(
                advertisement.currency
            ),
            authorization_url=None,
            access_code=None,
            provider_transaction_id=None,
            provider_metadata={},
            paid_at=None,
        )

        self.session.add(
            payment
        )

        await self.session.flush()

        if provider == PaymentProvider.MOCK:
            if (
                settings.environment
                == "production"
            ):
                raise HTTPException(
                    status_code=404,
                    detail=(
                        "Mock payments are "
                        "unavailable."
                    ),
                )

            payment.authorization_url = (
                f"{settings.frontend_url}"
                "/advertise/payment/mock"
                f"?reference={reference}"
            )

            await self.session.commit()

            return await self.get_payment(
                reference=reference,
                management_token=(
                    management_token
                ),
            )

        try:
            if (
                provider
                == PaymentProvider.PAYSTACK
            ):
                await self._initialize_paystack(
                    payment=payment,
                    advertisement=(
                        advertisement
                    ),
                )

            elif (
                provider
                == PaymentProvider.FLUTTERWAVE
            ):
                await self._initialize_flutterwave(
                    payment=payment,
                    advertisement=(
                        advertisement
                    ),
                )

            else:
                raise RuntimeError(
                    "Unsupported advertisement "
                    "payment provider."
                )

            await self.session.commit()

            return await self.get_payment(
                reference=reference,
                management_token=(
                    management_token
                ),
            )

        except HTTPException:
            await self.session.rollback()
            raise

        except Exception as exc:
            payment.status = (
                PaymentStatus.FAILED
            )

            payment.provider_metadata = {
                "initialization_error": (
                    str(exc)
                ),
            }

            await self.session.commit()

            raise HTTPException(
                status_code=502,
                detail=(
                    "Advertisement payment "
                    "initialization failed. "
                    "Please try again."
                ),
            ) from exc

    async def verify(
        self,
        *,
        reference: str,
        management_token: str,
    ) -> AdvertisementPayment:
        payment = await self.get_payment(
            reference=reference,
            management_token=(
                management_token
            ),
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

        if (
            payment.provider
            == PaymentProvider.PAYSTACK
        ):
            await self._verify_paystack(
                payment
            )

        elif (
            payment.provider
            == PaymentProvider.FLUTTERWAVE
        ):
            await self._verify_flutterwave(
                payment
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported advertisement "
                    "payment provider."
                ),
            )

        await self.session.commit()

        return await self.get_payment(
            reference=reference,
            management_token=(
                management_token
            ),
        )

    async def complete_mock(
        self,
        *,
        reference: str,
        management_token: str,
    ) -> AdvertisementPayment:
        if (
            settings.environment
            == "production"
            or settings.payment_provider
            != "mock"
        ):
            raise HTTPException(
                status_code=404,
                detail=(
                    "Mock advertisement payment "
                    "is unavailable."
                ),
            )

        payment = await self.get_payment(
            reference=reference,
            management_token=(
                management_token
            ),
        )

        locked_payment = (
            await self._get_payment_for_update(
                payment.reference
            )
        )

        await self._fulfil(
            locked_payment,
            provider_transaction_id=(
                f"mock-{payment.reference}"
            ),
            provider_metadata={
                "mock": True,
            },
        )

        await self.session.commit()

        return await self.get_payment(
            reference=reference,
            management_token=(
                management_token
            ),
        )

    async def get_payment(
        self,
        *,
        reference: str,
        management_token: str,
    ) -> AdvertisementPayment:
        advertisement = (
            await self._get_advertisement(
                management_token=(
                    management_token
                ),
                for_update=False,
            )
        )

        payment = await self.session.scalar(
            select(
                AdvertisementPayment
            ).where(
                AdvertisementPayment.reference
                == reference,
                AdvertisementPayment.advertisement_id
                == advertisement.id,
            )
        )

        if payment is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Advertisement payment "
                    "could not be found."
                ),
            )

        return payment

    async def _initialize_paystack(
        self,
        *,
        payment: AdvertisementPayment,
        advertisement: Advertisement,
    ) -> None:
        callback_url = (
            f"{settings.frontend_url}"
            "/advertise/payment/callback"
        )

        payload = {
            "email": (
                advertisement.contact_email
            ),
            "amount": payment.amount_kobo,
            "currency": payment.currency,
            "reference": (
                payment.reference
            ),
            "callback_url": callback_url,
            "metadata": {
                "payment_kind": (
                    "advertisement"
                ),
                "advertisement_id": str(
                    advertisement.id
                ),
                "advertisement_reference": (
                    advertisement.reference
                ),
                "advertisement_payment_id": str(
                    payment.id
                ),
                "duration_days": (
                    advertisement.duration_days
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

        data = body.get(
            "data"
        ) or {}

        if (
            not body.get("status")
            or not data.get(
                "authorization_url"
            )
        ):
            raise RuntimeError(
                "Paystack advertisement "
                "initialization returned "
                "an invalid response."
            )

        payment.authorization_url = (
            data[
                "authorization_url"
            ]
        )

        payment.access_code = data.get(
            "access_code"
        )

        payment.provider_metadata = body

    async def _initialize_flutterwave(
        self,
        *,
        payment: AdvertisementPayment,
        advertisement: Advertisement,
    ) -> None:
        amount = (
            Decimal(
                payment.amount_kobo
            )
            / Decimal("100")
        ).quantize(
            Decimal("0.01")
        )

        redirect_url = (
            f"{settings.frontend_url}"
            "/advertise/payment/callback"
        )

        payload = {
            "tx_ref": payment.reference,
            "amount": format(
                amount,
                ".2f",
            ),
            "currency": (
                payment.currency
            ),
            "redirect_url": redirect_url,
            "customer": {
                "email": (
                    advertisement
                    .contact_email
                ),
                "name": (
                    advertisement
                    .business_name
                ),
                "phonenumber": (
                    advertisement
                    .contact_phone
                    or ""
                ),
            },
            "customizations": {
                "title": (
                    "HomeLink Sponsored Advert"
                ),
                "description": (
                    "Seven-day HomeLink "
                    "advertising campaign"
                ),
            },
            "meta": {
                "payment_kind": (
                    "advertisement"
                ),
                "advertisement_id": str(
                    advertisement.id
                ),
                "advertisement_reference": (
                    advertisement.reference
                ),
                "advertisement_payment_id": str(
                    payment.id
                ),
                "duration_days": (
                    advertisement.duration_days
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
            "data"
        ) or {}

        if (
            body.get("status")
            != "success"
            or not data.get("link")
        ):
            raise RuntimeError(
                "Flutterwave advertisement "
                "initialization returned "
                "an invalid response."
            )

        payment.authorization_url = (
            data["link"]
        )

        payment.provider_metadata = body

    async def _verify_paystack(
        self,
        payment: AdvertisementPayment,
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
                    "Advertisement payment "
                    "verification is temporarily "
                    "unavailable."
                ),
            ) from exc

        data = body.get(
            "data"
        ) or {}

        provider_status = str(
            data.get(
                "status",
                "",
            )
        ).lower()

        if provider_status == "success":
            if (
                int(
                    data.get(
                        "amount",
                        -1,
                    )
                )
                != payment.amount_kobo
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Advertisement payment "
                        "amount mismatch."
                    ),
                )

            if (
                str(
                    data.get(
                        "currency",
                        "",
                    )
                ).upper()
                != payment.currency.upper()
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Advertisement payment "
                        "currency mismatch."
                    ),
                )

            locked_payment = (
                await self._get_payment_for_update(
                    payment.reference
                )
            )

            await self._fulfil(
                locked_payment,
                provider_transaction_id=(
                    str(data.get("id"))
                    if data.get("id")
                    else None
                ),
                provider_metadata=body,
            )

            return

        status_map = {
            "abandoned": (
                PaymentStatus.ABANDONED
            ),
            "failed": PaymentStatus.FAILED,
            "reversed": (
                PaymentStatus.REFUNDED
            ),
        }

        locked_payment = (
            await self._get_payment_for_update(
                payment.reference
            )
        )

        if (
            locked_payment.status
            != PaymentStatus.SUCCESS
        ):
            locked_payment.status = (
                status_map.get(
                    provider_status,
                    PaymentStatus.PENDING,
                )
            )

            locked_payment.provider_metadata = (
                body
            )

            if data.get("id"):
                locked_payment.provider_transaction_id = (
                    str(data["id"])
                )

    async def _verify_flutterwave(
        self,
        payment: AdvertisementPayment,
    ) -> None:
        body = (
            await self._fetch_flutterwave(
                payment.reference
            )
        )

        data = body.get(
            "data"
        ) or {}

        if (
            str(
                data.get(
                    "tx_ref",
                    "",
                )
            )
            != payment.reference
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Advertisement payment "
                    "reference mismatch."
                ),
            )

        provider_status = str(
            data.get(
                "status",
                "",
            )
        ).lower()

        if (
            provider_status
            == "successful"
        ):
            expected_amount = (
                Decimal(
                    payment.amount_kobo
                )
                / Decimal("100")
            ).quantize(
                Decimal("0.01")
            )

            try:
                actual_amount = Decimal(
                    str(
                        data.get("amount")
                    )
                ).quantize(
                    Decimal("0.01")
                )

            except (
                InvalidOperation,
                TypeError,
                ValueError,
            ) as exc:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Invalid advertisement "
                        "payment amount."
                    ),
                ) from exc

            if (
                actual_amount
                != expected_amount
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Advertisement payment "
                        "amount mismatch."
                    ),
                )

            if (
                str(
                    data.get(
                        "currency",
                        "",
                    )
                ).upper()
                != payment.currency.upper()
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Advertisement payment "
                        "currency mismatch."
                    ),
                )

            locked_payment = (
                await self._get_payment_for_update(
                    payment.reference
                )
            )

            await self._fulfil(
                locked_payment,
                provider_transaction_id=(
                    str(data.get("id"))
                    if data.get("id")
                    else None
                ),
                provider_metadata=body,
            )

            return

        status_map = {
            "failed": PaymentStatus.FAILED,
            "cancelled": (
                PaymentStatus.ABANDONED
            ),
            "canceled": (
                PaymentStatus.ABANDONED
            ),
            "reversed": (
                PaymentStatus.REFUNDED
            ),
        }

        locked_payment = (
            await self._get_payment_for_update(
                payment.reference
            )
        )

        if (
            locked_payment.status
            != PaymentStatus.SUCCESS
        ):
            locked_payment.status = (
                status_map.get(
                    provider_status,
                    PaymentStatus.PENDING,
                )
            )

            locked_payment.provider_metadata = (
                body
            )

            if data.get("id"):
                locked_payment.provider_transaction_id = (
                    str(data["id"])
                )

    async def _fetch_flutterwave(
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
                    },
                )

                response.raise_for_status()

                body = response.json()

        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Advertisement payment "
                    "verification is temporarily "
                    "unavailable."
                ),
            ) from exc

        if not isinstance(
            body,
            dict,
        ):
            raise HTTPException(
                status_code=502,
                detail=(
                    "Flutterwave returned an "
                    "invalid verification response."
                ),
            )

        return body

    async def _get_advertisement(
        self,
        *,
        management_token: str,
        for_update: bool,
    ) -> Advertisement:
        token_hash = (
            AdvertisingService
            .hash_management_token(
                management_token
            )
        )

        if for_update:
            advertisement = (
                await self.advertisements
                .get_by_management_token_hash_for_update(
                    token_hash
                )
            )

        else:
            advertisement = (
                await self.advertisements
                .get_by_management_token_hash(
                    token_hash
                )
            )

        if advertisement is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Advertisement could "
                    "not be found."
                ),
            )

        return advertisement

    async def _get_payment_for_update(
        self,
        reference: str,
    ) -> AdvertisementPayment:
        payment = await self.session.scalar(
            select(
                AdvertisementPayment
            )
            .where(
                AdvertisementPayment.reference
                == reference,
            )
            .with_for_update()
        )

        if payment is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Advertisement payment "
                    "could not be found."
                ),
            )

        return payment

    async def _fulfil(
        self,
        payment: AdvertisementPayment,
        *,
        provider_transaction_id: (
            str | None
        ),
        provider_metadata: dict,
    ) -> None:
        """
        Idempotently complete an advertisement payment.

        Unlike listing payments, this never grants or modifies
        listing credits.
        """

        if (
            payment.status
            == PaymentStatus.SUCCESS
        ):
            return

        advertisement = await self.session.scalar(
            select(
                Advertisement
            )
            .where(
                Advertisement.id
                == payment.advertisement_id,
            )
            .with_for_update()
        )

        if advertisement is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Advertisement could "
                    "not be found."
                ),
            )

        existing_success = await self.session.scalar(
            select(
                AdvertisementPayment.id
            )
            .where(
                AdvertisementPayment.advertisement_id
                == advertisement.id,
                AdvertisementPayment.status
                == PaymentStatus.SUCCESS,
                AdvertisementPayment.id
                != payment.id,
            )
            .limit(1)
        )

        if existing_success is not None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This advertisement already "
                    "has a successful payment."
                ),
            )

        paid_at = datetime.now(
            UTC
        )

        payment.status = (
            PaymentStatus.SUCCESS
        )

        payment.provider_transaction_id = (
            provider_transaction_id
        )

        payment.provider_metadata = (
            provider_metadata
        )

        payment.paid_at = paid_at

        advertisement.status = (
            AdvertisementStatus
            .PENDING_REVIEW
        )

        advertisement.review_notes = None
        advertisement.rejection_reason = None

        # The campaign timer intentionally remains empty.
        advertisement.starts_at = None
        advertisement.ends_at = None

        await self.session.flush()

    def _choose_provider(
        self,
        requested_provider: (
            PaymentProvider
            | None
        ),
    ) -> PaymentProvider:
        configured_provider = (
            settings.payment_provider
        )

        if configured_provider == "both":
            provider = (
                requested_provider
                or PaymentProvider.PAYSTACK
            )

            if provider not in {
                PaymentProvider.PAYSTACK,
                PaymentProvider.FLUTTERWAVE,
            }:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Choose Paystack or "
                        "Flutterwave for checkout."
                    ),
                )

            return provider

        provider = PaymentProvider(
            configured_provider
        )

        if (
            requested_provider is not None
            and requested_provider
            != provider
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "The selected payment "
                    "provider is unavailable."
                ),
            )

        return provider