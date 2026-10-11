"""Update HomeLink launch allowances and paid listing prices.

Revision ID: 20260918_0010
Revises: 20260820_0009
Create Date: 2026-09-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260918_0010"

down_revision: str | Sequence[str] | None = (
    "20260820_0009"
)

branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE payment_plans
            SET
                name = 'Rental Listing Credit',
                description = 'One additional HomeLink rental posting credit.',
                credit_quantity = 1,
                amount_kobo = 300000,
                currency = 'NGN',
                is_active = true,
                sort_order = 1
            WHERE code = 'rental-one'
            """
        )
    )

    op.execute(
        sa.text(
            """
            UPDATE payment_plans
            SET
                name = 'Property Listing Credit',
                description = 'One additional HomeLink property-for-sale posting credit.',
                credit_quantity = 1,
                amount_kobo = 500000,
                currency = 'NGN',
                is_active = true,
                sort_order = 2
            WHERE code = 'property-one'
            """
        )
    )

    op.execute(
        sa.text(
            """
            UPDATE payment_plans
            SET
                code = 'marketplace-two',
                name = 'Marketplace 2-Post Pack',
                description = 'Two additional HomeLink marketplace posting credits.',
                credit_quantity = 2,
                amount_kobo = 100000,
                currency = 'NGN',
                is_active = true,
                sort_order = 3
            WHERE code = 'marketplace-five'
            """
        )
    )

    # Cap every unused free allowance at one.
    # This never creates credits or makes a balance negative.
    op.execute(
        sa.text(
            """
            UPDATE listing_credit_balances
            SET free_remaining = LEAST(
                free_remaining,
                1
            )
            WHERE credit_type IN (
                'marketplace',
                'rental',
                'buy_property'
            )
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE payment_plans
            SET
                name = 'Rental Listing Credit',
                description = 'One additional HomeLink rental posting credit.',
                credit_quantity = 1,
                amount_kobo = 100000,
                currency = 'NGN',
                is_active = true,
                sort_order = 1
            WHERE code = 'rental-one'
            """
        )
    )

    op.execute(
        sa.text(
            """
            UPDATE payment_plans
            SET
                name = 'Property Listing Credit',
                description = 'One additional HomeLink property for sale posting credit.',
                credit_quantity = 1,
                amount_kobo = 200000,
                currency = 'NGN',
                is_active = true,
                sort_order = 2
            WHERE code = 'property-one'
            """
        )
    )

    op.execute(
        sa.text(
            """
            UPDATE payment_plans
            SET
                code = 'marketplace-five',
                name = 'Marketplace 5-Post Pack',
                description = 'Five additional HomeLink marketplace posting credits.',
                credit_quantity = 5,
                amount_kobo = 100000,
                currency = 'NGN',
                is_active = true,
                sort_order = 3
            WHERE code = 'marketplace-two'
            """
        )
    )

    # Previously consumed free allowances cannot safely
    # be recreated during a downgrade.