from fastapi import APIRouter

from app.api.v1.endpoints import (
    account,
    admin_agents,
    admin_audit,
    admin_listings,
    admin_maintenance,
    admin_reports,
    admin_users,
    agents,
    auth,
    dashboard,
    email_verification,
    engagements,
    health,
    legal,
    listings,
    live_events,
    locations,
    media,
    notifications,
    payments,
    users,
)


api_router = APIRouter()


api_router.include_router(
    health.router
)

api_router.include_router(
    legal.router
)

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

api_router.include_router(
    locations.router
)

api_router.include_router(
    agents.router
)

api_router.include_router(
    listings.router
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

api_router.include_router(
    payments.router
)

api_router.include_router(
    media.router
)

# ------------------------------------------------------------
# REAL-TIME EVENTS
#
# One authenticated SSE connection per active browser session.
# The stream listens to Redis and does not hold a DB connection.
# ------------------------------------------------------------

api_router.include_router(
    live_events.router
)


# ------------------------------------------------------------
# ADMIN
# ------------------------------------------------------------

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