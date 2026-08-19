from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


class AuditService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def add(
        self,
        *,
        action: str,
        actor_user_id: UUID | None = None,
        target_type: str | None = None,
        target_id: str | None = None,
        request_id: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
    ) -> AuditLog:
        log = AuditLog(
            actor_user_id=actor_user_id,
            action=action[:160],
            target_type=target_type[:100] if target_type else None,
            target_id=target_id[:160] if target_id else None,
            request_id=(request_id or str(uuid4()))[:64],
            ip_address=ip_address[:45] if ip_address else None,
            user_agent=user_agent[:500] if user_agent else None,
            status_code=status_code,
            details=details or {},
        )
        self.session.add(log)
        return log