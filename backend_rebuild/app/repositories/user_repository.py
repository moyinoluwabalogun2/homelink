from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from app.models.user import User


class UserRepository:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    # ============================================================
    # RELATIONSHIP LOADING POLICY
    #
    # User is used heavily by authentication.
    #
    # The User model currently has several relationships configured
    # with lazy="selectin". Without an explicit override, a simple
    # authentication lookup can trigger additional SELECTs for:
    #
    # - auth sessions
    # - password reset tokens
    # - email verification tokens
    # - agent profile
    # - listings
    #
    # Authentication only needs scalar account fields such as:
    #
    # id, password_hash, role, status, auth_version, lock state...
    #
    # Do not load unrelated collections for these repository calls.
    # ============================================================

    @staticmethod
    def _without_relationships():
        return (
            noload(
                User.auth_sessions
            ),
            noload(
                User.password_reset_tokens
            ),
            noload(
                User.email_verification_tokens
            ),
            noload(
                User.agent_profile
            ),
            noload(
                User.listings
            ),
        )

    # ============================================================
    # BY ID
    # ============================================================

    async def get_by_id(
        self,
        user_id: UUID,
    ) -> User | None:
        return await self.session.scalar(
            select(
                User
            )
            .options(
                *self._without_relationships()
            )
            .where(
                User.id == user_id
            )
        )

    # ============================================================
    # BY ID + LOCK
    # ============================================================

    async def get_by_id_for_update(
        self,
        user_id: UUID,
    ) -> User | None:
        return await self.session.scalar(
            select(
                User
            )
            .options(
                *self._without_relationships()
            )
            .where(
                User.id == user_id
            )
            .with_for_update()
        )

    # ============================================================
    # BY EMAIL
    # ============================================================

    async def get_by_email(
        self,
        email: str,
    ) -> User | None:
        return await self.session.scalar(
            select(
                User
            )
            .options(
                *self._without_relationships()
            )
            .where(
                User.email
                == email.lower()
            )
        )

    # ============================================================
    # BY EMAIL + LOCK
    # ============================================================

    async def get_by_email_for_update(
        self,
        email: str,
    ) -> User | None:
        return await self.session.scalar(
            select(
                User
            )
            .options(
                *self._without_relationships()
            )
            .where(
                User.email
                == email.lower()
            )
            .with_for_update()
        )

    # ============================================================
    # BY PHONE
    # ============================================================

    async def get_by_phone(
        self,
        phone: str,
    ) -> User | None:
        return await self.session.scalar(
            select(
                User
            )
            .options(
                *self._without_relationships()
            )
            .where(
                User.phone == phone
            )
        )

    # ============================================================
    # ADD
    # ============================================================

    def add(
        self,
        user: User,
    ) -> None:
        self.session.add(
            user
        )