from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import (
    CreditType,
    PaymentProvider,
    PaymentStatus,
)
from app.schemas.common import ORMModel


class CreditBalanceRead(ORMModel):
    credit_type: CreditType
    free_remaining: int
    paid_remaining: int


class PaymentPlanRead(ORMModel):
    id: UUID
    code: str
    name: str
    description: str
    credit_type: CreditType
    credit_quantity: int
    amount_kobo: int
    currency: str


class PaymentInitializeRequest(BaseModel):
    plan_code: str = Field(min_length=2, max_length=80)


class PaymentRead(ORMModel):
    id: UUID
    reference: str
    provider: PaymentProvider
    status: PaymentStatus
    amount_kobo: int
    currency: str
    authorization_url: str | None
    paid_at: datetime | None
    plan: PaymentPlanRead
    created_at: datetime


class PaymentInitializeResponse(BaseModel):
    payment: PaymentRead
    authorization_url: str