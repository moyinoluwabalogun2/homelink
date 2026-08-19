from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.auth_dependencies import CurrentUser, require_roles
from app.api.dependencies import DbSession
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.dashboard import AdminDashboardSummary, UserDashboardSummary
from app.services.dashboard_service import DashboardService


router = APIRouter(tags=["dashboard"])
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("/dashboard/summary", response_model=UserDashboardSummary)
async def user_dashboard_summary(
    session: DbSession,
    current_user: CurrentUser,
) -> UserDashboardSummary:
    return await DashboardService(session).user_summary(current_user)


@router.get("/admin/dashboard/summary", response_model=AdminDashboardSummary)
async def admin_dashboard_summary(
    session: DbSession,
    _: AdminUser,
) -> AdminDashboardSummary:
    return await DashboardService(session).admin_summary()