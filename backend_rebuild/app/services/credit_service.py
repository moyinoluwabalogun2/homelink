from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.enums import (
    CreditSource,
    CreditType,
    ListingType,
    UserRole,
)
from app.models.listing import Listing
from app.models.payment import (
    ListingCreditBalance,
    PaymentPlan,
)
from app.models.user import User


settings = get_settings()


class CreditService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    @staticmethod
    def credit_type_for_listing(
        listing_type: ListingType,
    ) -> CreditType:
        return {
            ListingType.MARKETPLACE:
                CreditType.MARKETPLACE,

            ListingType.RENTAL:
                CreditType.RENTAL,

            ListingType.BUY_PROPERTY:
                CreditType.BUY_PROPERTY,
        }[listing_type]

    @staticmethod
    def default_free_amount(
        credit_type: CreditType,
    ) -> int:
        return {
            CreditType.MARKETPLACE:
                settings.free_marketplace_listings,

            CreditType.RENTAL:
                settings.free_rental_listings,

            CreditType.BUY_PROPERTY:
                settings.free_buy_property_listings,
        }[credit_type]

    # =========================================================
    # INITIALIZE ALL CREDIT BALANCES
    #
    # Called when an account is created and by the one-time
    # legacy-account backfill.
    #
    # Safe to call repeatedly because of ON CONFLICT.
    # Does NOT commit. The caller owns the transaction.
    # =========================================================

    async def initialize_balances(
        self,
        *,
        user_id: UUID,
    ) -> None:
        credit_types = list(
            CreditType,
        )

        await self.session.execute(
            insert(
                ListingCreditBalance,
            )
            .values(
                [
                    {
                        "user_id":
                            user_id,

                        "credit_type":
                            credit_type,

                        "free_remaining":
                            self.default_free_amount(
                                credit_type,
                            ),

                        "paid_remaining":
                            0,
                    }
                    for credit_type
                    in credit_types
                ]
            )
            .on_conflict_do_nothing(
                index_elements=[
                    "user_id",
                    "credit_type",
                ],
            )
        )

    # =========================================================
    # GET ONE BALANCE FOR A MUTATION
    #
    # This remains defensive.
    #
    # Posting/payment operations may create a missing balance,
    # but ordinary dashboard reads never do.
    # =========================================================

    async def ensure_balance(
        self,
        *,
        user_id: UUID,
        credit_type: CreditType,
        for_update: bool = False,
    ) -> ListingCreditBalance:
        await self.session.execute(
            insert(
                ListingCreditBalance,
            )
            .values(
                user_id=user_id,

                credit_type=
                    credit_type,

                free_remaining=
                    self.default_free_amount(
                        credit_type,
                    ),

                paid_remaining=0,
            )
            .on_conflict_do_nothing(
                index_elements=[
                    "user_id",
                    "credit_type",
                ],
            )
        )

        statement = (
            select(
                ListingCreditBalance,
            )
            .where(
                ListingCreditBalance.user_id
                == user_id,

                ListingCreditBalance.credit_type
                == credit_type,
            )
        )

        if for_update:
            statement = (
                statement.with_for_update(
                    of=ListingCreditBalance,
                )
            )

        balance = await self.session.scalar(
            statement,
        )

        if balance is None:
            raise RuntimeError(
                "Credit balance could not be created."
            )

        return balance

    # =========================================================
    # READ ALL BALANCES
    #
    # IMPORTANT:
    # Pure SELECT.
    #
    # Dashboard and Credits page do NOT insert, lock or commit.
    # =========================================================

    async def list_balances(
        self,
        user_id: UUID,
    ) -> list[ListingCreditBalance]:
        result = await self.session.scalars(
            select(
                ListingCreditBalance,
            )
            .where(
                ListingCreditBalance.user_id
                == user_id,
            )
        )

        balances = list(
            result.all(),
        )

        by_type = {
            balance.credit_type:
                balance
            for balance
            in balances
        }

        missing = [
            credit_type
            for credit_type
            in CreditType
            if credit_type
            not in by_type
        ]

        if missing:
            raise RuntimeError(
                "Credit balances are not fully "
                "initialized for this account."
            )

        return [
            by_type[
                credit_type
            ]
            for credit_type
            in CreditType
        ]

    # =========================================================
    # CONSUME CREDIT FOR LISTING
    # =========================================================

    async def consume_for_listing(
        self,
        *,
        user: User,
        listing: Listing,
    ) -> None:
        if (
            listing.posting_credit_charged_at
            is not None
        ):
            return

        if (
            user.role
            == UserRole.ADMIN
        ):
            listing.posting_credit_charged_at = (
                datetime.now(
                    UTC,
                )
            )

            listing.posting_credit_source = (
                CreditSource.ADMIN
            )

            return

        credit_type = (
            self.credit_type_for_listing(
                listing.listing_type,
            )
        )

        balance = await self.ensure_balance(
            user_id=user.id,
            credit_type=credit_type,
            for_update=True,
        )

        if (
            balance.free_remaining
            > 0
        ):
            balance.free_remaining -= 1

            source = (
                CreditSource.FREE
            )

        elif (
            balance.paid_remaining
            > 0
        ):
            balance.paid_remaining -= 1

            source = (
                CreditSource.PAID
            )

        else:
            raise HTTPException(
                status_code=402,
                detail=(
                    "No posting credit is available "
                    "for this listing type. Purchase "
                    "a credit package before submitting."
                ),
            )

        listing.posting_credit_charged_at = (
            datetime.now(
                UTC,
            )
        )

        listing.posting_credit_source = (
            source
        )

    # =========================================================
    # GRANT PAID CREDITS
    # =========================================================

    async def grant_paid_credits(
        self,
        *,
        user_id: UUID,
        plan: PaymentPlan,
    ) -> ListingCreditBalance:
        balance = await self.ensure_balance(
            user_id=user_id,
            credit_type=plan.credit_type,
            for_update=True,
        )

        balance.paid_remaining += (
            plan.credit_quantity
        )

        return balance