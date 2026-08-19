from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.api.auth_dependencies import require_roles
from app.api.dependencies import DbSession
from app.models.audit import AuditLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.finalization import AuditLogRead


router = APIRouter(prefix="/admin/audit-logs", tags=["admin-audit"])
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("", response_model=list[AuditLogRead])
async def list_audit_logs(
    session: DbSession,
    _: AdminUser,
    actor_user_id: UUID | None = None,
    action: str | None = Query(default=None, max_length=160),
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[AuditLogRead]:
    statement = select(AuditLog)
    if actor_user_id is not None:
        statement = statement.where(AuditLog.actor_user_id == actor_user_id)
    if action:
        statement = statement.where(AuditLog.action.ilike(f"%{action.strip()}%"))
    if created_from is not None:
        statement = statement.where(AuditLog.created_at >= created_from)
    if created_to is not None:
        statement = statement.where(AuditLog.created_at <= created_to)

    result = await session.scalars(
        statement.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    )
    return [AuditLogRead.model_validate(log) for log in result.all()]