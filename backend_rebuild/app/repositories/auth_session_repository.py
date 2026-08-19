from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth_session import AuthSession


class AuthSessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(
        self,
        session_id: UUID,
    ) -> AuthSession | None:
        statement = (
            select(AuthSession)
            .options(
                selectinload(AuthSession.user),
            )
            .where(
                AuthSession.id == session_id,
            )
            .with_for_update(
                of=AuthSession,
            )
        )

        return await self.session.scalar(statement)

    def add(
        self,
        auth_session: AuthSession,
    ) -> None:
        self.session.add(auth_session)

    async def revoke_all_for_user(
        self,
        *,
        user_id: UUID,
        revoked_at: datetime,
    ) -> int:
        result = await self.session.execute(
            update(AuthSession)
            .where(
                AuthSession.user_id == user_id,
                AuthSession.revoked_at.is_(None),
            )
            .values(
                revoked_at=revoked_at,
            )
        )

        return int(result.rowcount or 0)