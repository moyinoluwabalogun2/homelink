"""Finalize HomeLink launch listing-credit pricing.

Revision ID: 20261011_0015
Revises: 20261006_0014
Create Date: 2026-10-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20261011_0015"

down_revision: str | Sequence[str] | None = (
    "20261006_0014"
)

branch_labels: (
    str
    | Sequence[str]
    | None
) = None

depends_on: (
    str
    | Sequence[str]
    | None
) = None


def upgrade() -> None:
    # One additional rental listing credit for ₦3,000.
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

    # One additional property listing credit for ₦5,000.
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

    # Final marketplace launch bundle:
    # four additional listings for ₦2,000.
    op.execute(
        sa.text(
            """
            UPDATE payment_plans
            SET
                code = 'marketplace-four',
                name = 'Marketplace 4-Post Pack',
                description = 'Four additional HomeLink marketplace posting credits.',
                credit_quantity = 4,
                amount_kobo = 200000,
                currency = 'NGN',
                is_active = true,
                sort_order = 3
            WHERE code = 'marketplace-two'
            """
        )
    )


def downgrade() -> None:
    # Restore the immediately preceding marketplace package.
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
            WHERE code = 'marketplace-four'
            """
        )
    )