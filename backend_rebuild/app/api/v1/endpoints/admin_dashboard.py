from __future__ import annotations

import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
)

from app.api.auth_dependencies import (
    require_roles,
)
from app.api.dependencies import (
    DbSession,
    RedisClient,
)
from app.models.enums import (
    UserRole,
)
from app.models.user import User
from app.schemas.admin_dashboard import (
    AdminDashboardRead,
)
from app.services.admin_dashboard_service import (
    AdminDashboardService,
)


logger = logging.getLogger(
    __name__
)


router = APIRouter(
    prefix="/admin/dashboard",
    tags=[
        "admin-dashboard",
    ],
)


AdminUser = Annotated[
    User,
    Depends(
        require_roles(
            UserRole.ADMIN
        )
    ),
]


ADMIN_DASHBOARD_CACHE_KEY = (
    "homelink:admin:dashboard:v1"
)

ADMIN_DASHBOARD_CACHE_SECONDS = 30


@router.get(
    "",
    response_model=AdminDashboardRead,
)
async def get_admin_dashboard(
    session: DbSession,
    redis: RedisClient,
    _: AdminUser,
) -> AdminDashboardRead:
    """
    Return the HomeLink business and moderation overview.

    Redis caches the completed aggregate snapshot for 30 seconds.
    A temporary Redis failure does not prevent an authenticated
    administrator from viewing the dashboard.
    """

    try:
        cached = await redis.get(
            ADMIN_DASHBOARD_CACHE_KEY
        )

    except Exception:
        logger.warning(
            "Admin dashboard Redis read failed.",
            exc_info=True,
        )

        cached = None

    if isinstance(
        cached,
        str,
    ):
        try:
            return (
                AdminDashboardRead
                .model_validate_json(
                    cached
                )
            )

        except Exception:
            logger.warning(
                "Invalid admin dashboard cache "
                "entry was ignored.",
                exc_info=True,
            )

    dashboard = (
        await AdminDashboardService(
            session
        ).get_dashboard()
    )

    try:
        await redis.setex(
            ADMIN_DASHBOARD_CACHE_KEY,
            ADMIN_DASHBOARD_CACHE_SECONDS,
            dashboard.model_dump_json(),
        )

    except Exception:
        logger.warning(
            "Admin dashboard Redis write failed.",
            exc_info=True,
        )

    return dashboard