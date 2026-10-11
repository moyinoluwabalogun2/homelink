from datetime import datetime
from uuid import UUID

from fastapi import (
    APIRouter,
    Query,
)

from app.api.auth_dependencies import CurrentUser
from app.api.dependencies import DbSession
from app.schemas.notification import (
    NotificationMarkAllReadResponse,
    NotificationPage,
    NotificationRead,
)
from app.services.notification_service import (
    NotificationService,
)


router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
)


# ============================================================
# LIST NOTIFICATIONS
# ============================================================

@router.get(
    "",
    response_model=NotificationPage,
)
async def list_notifications(
    session: DbSession,
    current_user: CurrentUser,
    unread_only: bool = False,
    limit: int = Query(
        default=30,
        ge=1,
        le=100,
    ),
    before: datetime | None = Query(
        default=None,
    ),
    before_id: UUID | None = Query(
        default=None,
    ),
) -> NotificationPage:
    return await NotificationService(
        session
    ).list_page(
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
        before=before,
        before_id=before_id,
    )


# ============================================================
# MARK ALL READ
# ============================================================

@router.patch(
    "/read-all",
    response_model=(
        NotificationMarkAllReadResponse
    ),
)
async def mark_all_notifications_read(
    session: DbSession,
    current_user: CurrentUser,
) -> NotificationMarkAllReadResponse:
    return await NotificationService(
        session
    ).mark_all_read(
        user_id=current_user.id,
    )


# ============================================================
# MARK ONE READ
# ============================================================

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationRead,
)
async def mark_notification_read(
    notification_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> NotificationRead:
    return await NotificationService(
        session
    ).mark_read(
        user_id=current_user.id,
        notification_id=notification_id,
    )