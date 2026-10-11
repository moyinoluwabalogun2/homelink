from datetime import datetime

from pydantic import BaseModel


class AdminRevenueSummary(
    BaseModel,
):
    total_kobo: int
    listing_credit_kobo: int
    advertisement_kobo: int

    paystack_kobo: int
    flutterwave_kobo: int
    mock_kobo: int

    successful_transactions: int
    pending_transactions: int
    failed_transactions: int
    abandoned_transactions: int
    refunded_transactions: int


class AdminUserSummary(
    BaseModel,
):
    total: int
    active: int
    pending_verification: int
    suspended: int
    deactivated: int
    registered_last_30_days: int


class AdminListingSummary(
    BaseModel,
):
    total: int
    draft: int
    pending: int
    published: int
    rejected: int
    expired: int
    sold: int
    rented: int
    archived: int


class AdminAgentSummary(
    BaseModel,
):
    total: int
    pending: int
    approved: int
    rejected: int


class AdminAdvertisementSummary(
    BaseModel,
):
    total: int
    payment_pending: int
    pending_review: int
    changes_requested: int
    approved: int
    scheduled: int
    live: int
    completed: int
    rejected: int
    cancelled: int
    refunded: int

    impressions: int
    clicks: int


class AdminDashboardRead(
    BaseModel,
):
    generated_at: datetime

    revenue: AdminRevenueSummary
    users: AdminUserSummary
    listings: AdminListingSummary
    agents: AdminAgentSummary
    advertisements: (
        AdminAdvertisementSummary
    )