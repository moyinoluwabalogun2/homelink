from __future__ import annotations

import json
from datetime import UTC, datetime
from hashlib import sha256

from sqlalchemy import (
    select,
)
from sqlalchemy.dialects.postgresql import (
    insert,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.models.advertising import (
    AdvertisementPayment,
)
from app.models.enums import (
    PaymentProvider,
    PaymentStatus,
)
from app.models.payment import (
    PaymentWebhookEvent,
)
from app.services.advertisement_payment_service import (
    AdvertisementPaymentService,
)


ADVERTISEMENT_PAYMENT_PREFIX = (
    "HLADPAY-"
)


class AdvertisementWebhookService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

        self.payments = (
            AdvertisementPaymentService(
                session
            )
        )

    @staticmethod
    def extract_paystack_reference(
        raw_body: bytes,
    ) -> str | None:
        try:
            payload = json.loads(
                raw_body.decode(
                    "utf-8"
                )
            )

        except (
            UnicodeDecodeError,
            ValueError,
            TypeError,
            json.JSONDecodeError,
        ):
            return None

        if not isinstance(
            payload,
            dict,
        ):
            return None

        data = payload.get(
            "data"
        ) or {}

        if not isinstance(
            data,
            dict,
        ):
            return None

        reference = data.get(
            "reference"
        )

        if not isinstance(
            reference,
            str,
        ):
            return None

        clean_reference = (
            reference.strip()
        )

        if not clean_reference.startswith(
            ADVERTISEMENT_PAYMENT_PREFIX
        ):
            return None

        return clean_reference

    @staticmethod
    def extract_flutterwave_reference(
        raw_body: bytes,
    ) -> str | None:
        try:
            payload = json.loads(
                raw_body.decode(
                    "utf-8"
                )
            )

        except (
            UnicodeDecodeError,
            ValueError,
            TypeError,
            json.JSONDecodeError,
        ):
            return None

        if not isinstance(
            payload,
            dict,
        ):
            return None

        data = payload.get(
            "data"
        ) or {}

        if not isinstance(
            data,
            dict,
        ):
            return None

        reference = data.get(
            "tx_ref"
        )

        if not isinstance(
            reference,
            str,
        ):
            return None

        clean_reference = (
            reference.strip()
        )

        if not clean_reference.startswith(
            ADVERTISEMENT_PAYMENT_PREFIX
        ):
            return None

        return clean_reference

    async def process_paystack_webhook(
        self,
        raw_body: bytes,
    ) -> None:
        payload = json.loads(
            raw_body.decode(
                "utf-8"
            )
        )

        event_type = str(
            payload.get(
                "event",
                "unknown",
            )
        )

        event_key = sha256(
            b"paystack:" + raw_body
        ).hexdigest()

        inserted_event_id = (
            await self.session.scalar(
                insert(
                    PaymentWebhookEvent
                )
                .values(
                    provider=(
                        PaymentProvider
                        .PAYSTACK
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
                    PaymentWebhookEvent.id
                )
            )
        )

        if inserted_event_id is None:
            return

        data = payload.get(
            "data"
        ) or {}

        reference = str(
            data.get(
                "reference",
                "",
            )
        ).strip()

        if (
            event_type
            == "charge.success"
            and reference.startswith(
                ADVERTISEMENT_PAYMENT_PREFIX
            )
        ):
            payment = (
                await self._get_payment(
                    reference=reference,
                    provider=(
                        PaymentProvider
                        .PAYSTACK
                    ),
                )
            )

            if payment is not None:
                # Do not rely only on webhook fields. Confirm the
                # transaction against Paystack's verification API.
                await self.payments._verify_paystack(
                    payment
                )

        event = await self.session.get(
            PaymentWebhookEvent,
            inserted_event_id,
        )

        if event is not None:
            event.processed_at = (
                datetime.now(
                    UTC
                )
            )

        await self.session.commit()

    async def process_flutterwave_webhook(
        self,
        raw_body: bytes,
    ) -> None:
        payload = json.loads(
            raw_body.decode(
                "utf-8"
            )
        )

        event_type = str(
            payload.get(
                "event",
                "unknown",
            )
        )

        event_key = sha256(
            b"flutterwave:" + raw_body
        ).hexdigest()

        inserted_event_id = (
            await self.session.scalar(
                insert(
                    PaymentWebhookEvent
                )
                .values(
                    provider=(
                        PaymentProvider
                        .FLUTTERWAVE
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
                    PaymentWebhookEvent.id
                )
            )
        )

        if inserted_event_id is None:
            return

        data = payload.get(
            "data"
        ) or {}

        reference = str(
            data.get(
                "tx_ref",
                "",
            )
        ).strip()

        if reference.startswith(
            ADVERTISEMENT_PAYMENT_PREFIX
        ):
            payment = (
                await self._get_payment(
                    reference=reference,
                    provider=(
                        PaymentProvider
                        .FLUTTERWAVE
                    ),
                )
            )

            if payment is not None:
                provider_status = str(
                    data.get(
                        "status",
                        "",
                    )
                ).lower()

                if (
                    event_type
                    == "charge.completed"
                    and provider_status
                    == "successful"
                ):
                    # Flutterwave is queried directly before the
                    # payment can move to SUCCESS.
                    await self.payments._verify_flutterwave(
                        payment
                    )

                elif provider_status in {
                    "failed",
                    "cancelled",
                    "canceled",
                }:
                    locked_payment = (
                        await self.payments
                        ._get_payment_for_update(
                            payment.reference
                        )
                    )

                    if (
                        locked_payment.status
                        != PaymentStatus.SUCCESS
                    ):
                        if (
                            provider_status
                            == "failed"
                        ):
                            locked_payment.status = (
                                PaymentStatus
                                .FAILED
                            )

                        else:
                            locked_payment.status = (
                                PaymentStatus
                                .ABANDONED
                            )

                        locked_payment.provider_metadata = (
                            payload
                        )

                        if data.get("id"):
                            locked_payment.provider_transaction_id = (
                                str(
                                    data["id"]
                                )
                            )

        event = await self.session.get(
            PaymentWebhookEvent,
            inserted_event_id,
        )

        if event is not None:
            event.processed_at = (
                datetime.now(
                    UTC
                )
            )

        await self.session.commit()

    async def _get_payment(
        self,
        *,
        reference: str,
        provider: PaymentProvider,
    ) -> AdvertisementPayment | None:
        return await self.session.scalar(
            select(
                AdvertisementPayment
            ).where(
                AdvertisementPayment.reference
                == reference,
                AdvertisementPayment.provider
                == provider,
            )
        )