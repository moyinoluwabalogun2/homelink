from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.auth_dependencies import require_roles
from app.api.dependencies import DbSession
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.finalization import MaintenanceResult
from app.services.audit_service import AuditService
from app.services.maintenance_service import MaintenanceService


router = APIRouter(prefix="/admin/maintenance", tags=["admin-maintenance"])
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.post("/run", response_model=MaintenanceResult)
async def run_maintenance(
    session: DbSession,
    admin: AdminUser,
) -> MaintenanceResult:
    result = await MaintenanceService(session).run()

    AuditService(session).add(
        action="admin.maintenance_run",
        actor_user_id=admin.id,
        target_type="system",
        target_id="maintenance",
        details=result,
    )
    await session.commit()
    return MaintenanceResult(**result)