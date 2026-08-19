from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.auth_dependencies import require_roles
from app.api.dependencies import DbSession
from app.models.enums import ReportStatus, UserRole
from app.models.user import User
from app.schemas.engagement import ListingReportRead, ListingReportResolve
from app.services.engagement_service import EngagementService


router = APIRouter(prefix="/admin/reports", tags=["admin-reports"])
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("", response_model=list[ListingReportRead])
async def list_reports(
    session: DbSession,
    _: AdminUser,
    status: ReportStatus | None = None,
) -> list[ListingReportRead]:
    records = await EngagementService(session).list_admin_reports(status)
    return [ListingReportRead.model_validate(item) for item in records]


@router.patch("/{report_id}", response_model=ListingReportRead)
async def resolve_report(
    report_id: UUID,
    payload: ListingReportResolve,
    session: DbSession,
    admin: AdminUser,
) -> ListingReportRead:
    report = await EngagementService(session).resolve_report(
        admin=admin,
        report_id=report_id,
        payload=payload,
    )
    return ListingReportRead.model_validate(report)