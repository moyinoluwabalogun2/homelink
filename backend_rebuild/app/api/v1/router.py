from fastapi import (
    APIRouter,
)

from app.api.v1.endpoints import (
    account,
    admin_advertisements,
    admin_agents,
    admin_audit,
    admin_dashboard,
    admin_listings,
    admin_maintenance,
    admin_reports,
    admin_users,
    advertisement_payments,
    advertising,
    agents,
    auth,
    dashboard,
    email_verification,
    engagements,
    health,
    legal,
    listing_edits,
    listings,
    live_events,
    live_statistics,
    locations,
    media,
    notifications,
    payments,
    users,
)


api_router = APIRouter()


# ------------------------------------------------------------
# HEALTH / LEGAL
# ------------------------------------------------------------

api_router.include_router(
    health.router
)

api_router.include_router(
    legal.router
)


# ------------------------------------------------------------
# AUTHENTICATION / ACCOUNT
# ------------------------------------------------------------

api_router.include_router(
    auth.router
)

api_router.include_router(
    email_verification.router
)

api_router.include_router(
    users.router
)

api_router.include_router(
    account.router
)


# ------------------------------------------------------------
# LOCATIONS / AGENTS
# ------------------------------------------------------------

api_router.include_router(
    locations.router
)

api_router.include_router(
    agents.router
)


# ------------------------------------------------------------
# LISTINGS / ENGAGEMENT
# ------------------------------------------------------------

api_router.include_router(
    listings.router
)

api_router.include_router(
    listing_edits.router
)

api_router.include_router(
    engagements.router
)

api_router.include_router(
    notifications.router
)

api_router.include_router(
    dashboard.router
)


# ------------------------------------------------------------
# PAYMENTS / MEDIA / ADVERTISING
# ------------------------------------------------------------

api_router.include_router(
    payments.router
)

api_router.include_router(
    media.router
)

api_router.include_router(
    advertising.router
)

api_router.include_router(
    advertisement_payments.router
)


# ------------------------------------------------------------
# PUBLIC ACTIVITY / REAL-TIME USER EVENTS
# ------------------------------------------------------------

api_router.include_router(
    live_statistics.router
)

api_router.include_router(
    live_events.router
)


# ------------------------------------------------------------
# ADMIN
# ------------------------------------------------------------

api_router.include_router(
    admin_dashboard.router
)

api_router.include_router(
    admin_agents.router
)

api_router.include_router(
    admin_listings.router
)

api_router.include_router(
    admin_reports.router
)

api_router.include_router(
    admin_users.router
)

api_router.include_router(
    admin_audit.router
)

api_router.include_router(
    admin_maintenance.router
)

api_router.include_router(
    admin_advertisements.router
)