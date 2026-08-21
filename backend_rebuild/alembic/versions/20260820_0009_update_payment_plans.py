"""Update HomeLink paid listing plans.

Revision ID: 20260820_0009
Revises: 20260817_0008
Create Date: 2026-08-20
"""

from collections.abc import Sequence
from uuid import UUID

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260820_0009"
down_revision: str | Sequence[str] | None = "20260817_0008"
branch_labels = None
depends_on = None


MARKETPLACE_PLAN_ID = UUID(
    "f55af9a9-1ed8-4a60-9b9e-c5a41354c201"
)

RENTAL_PLAN_ID = UUID(
    "62b18a15-0631-4b05-888b-d70f32366901"
)

PROPERTY_PLAN_ID = UUID(
    "a164d499-f756-4a32-8893-e84e3c55d902"
)


def upgrade() -> None:
    # Update the existing marketplace package:
    # ₦1,000 for 5 marketplace listings.
    op.execute(
        sa.text(
            """
            UPDATE payment_plans
            SET
                name = 'Marketplace 5-Post Pack',
                description = 'Five additional HomeLink marketplace posting credits.',
                credit_type = 'marketplace',
                credit_quantity = 5,
                amount_kobo = 100000,
                currency = 'NGN',
                is_active = true,
                sort_order = 3
            WHERE code = 'marketplace-five'
            """
        )
    )

    payment_plans = sa.table(
        "payment_plans",
        sa.column(
            "id",
            postgresql.UUID(as_uuid=True),
        ),
        sa.column("code", sa.String()),
        sa.column("name", sa.String()),
        sa.column("description", sa.String()),
        sa.column("credit_type", sa.String()),
        sa.column("credit_quantity", sa.Integer()),
        sa.column("amount_kobo", sa.Integer()),
        sa.column("currency", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("sort_order", sa.Integer()),
    )

    op.bulk_insert(
        payment_plans,
        [
            {
                "id": RENTAL_PLAN_ID,
                "code": "rental-one",
                "name": "Rental Listing Credit",
                "description": (
                    "One additional HomeLink rental "
                    "posting credit."
                ),
                "credit_type": "rental",
                "credit_quantity": 1,
                "amount_kobo": 100000,
                "currency": "NGN",
                "is_active": True,
                "sort_order": 1,
            },
            {
                "id": PROPERTY_PLAN_ID,
                "code": "property-one",
                "name": "Property Listing Credit",
                "description": (
                    "One additional HomeLink property "
                    "for sale posting credit."
                ),
                "credit_type": "buy_property",
                "credit_quantity": 1,
                "amount_kobo": 200000,
                "currency": "NGN",
                "is_active": True,
                "sort_order": 2,
            },
        ],
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM payment_plans
            WHERE code IN ('rental-one', 'property-one')
            """
        )
    )

    op.execute(
        sa.text(
            """
            UPDATE payment_plans
            SET
                amount_kobo = 50000,
                sort_order = 1
            WHERE code = 'marketplace-five'
            """
        )
    )