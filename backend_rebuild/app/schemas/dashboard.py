from pydantic import BaseModel

from app.schemas.payment import CreditBalanceRead


class UserDashboardSummary(BaseModel):
    saved_listings: int
    sent_inquiries: int
    received_inquiries: int

    unread_notifications: int
    unread_messages: int

    listings_by_status: dict[str, int]
    credits: list[CreditBalanceRead]


class AdminDashboardSummary(BaseModel):
    users: int
    pending_agent_applications: int
    pending_listings: int
    open_reports: int
    successful_payments: int
    successful_payment_value_kobo: int