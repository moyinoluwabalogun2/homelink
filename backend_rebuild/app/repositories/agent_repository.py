from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.agent import (
    AgentCoverageArea,
    AgentProfile,
)
from app.models.enums import (
    AgentApplicationStatus,
)


class AgentRepository:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    @staticmethod
    def _options():
        return (
            selectinload(
                AgentProfile.coverage_areas
            ),
            selectinload(
                AgentProfile.documents
            ),
        )

    # ============================================================
    # GET BY USER
    # ============================================================

    async def get_by_user_id(
        self,
        user_id: UUID,
    ) -> AgentProfile | None:
        return await self.session.scalar(
            select(
                AgentProfile
            )
            .options(
                *self._options()
            )
            .where(
                AgentProfile.user_id
                == user_id,
                AgentProfile.deleted_at
                .is_(None),
            )
        )

    # ============================================================
    # GET BY PROFILE ID
    # ============================================================

    async def get_by_id(
        self,
        profile_id: UUID,
    ) -> AgentProfile | None:
        return await self.session.scalar(
            select(
                AgentProfile
            )
            .options(
                *self._options()
            )
            .where(
                AgentProfile.id
                == profile_id,
                AgentProfile.deleted_at
                .is_(None),
            )
        )

    # ============================================================
    # GET BY PROFILE ID + ROW LOCK
    #
    # Used for state transitions such as:
    #
    # PENDING -> APPROVED
    # PENDING -> REJECTED
    #
    # The lock prevents two administrators from making
    # conflicting decisions against the same stale PENDING
    # application at the same time.
    #
    # selectinload is safe here because related collections are
    # loaded using separate SELECT statements rather than an
    # OUTER JOIN in the FOR UPDATE statement.
    # ============================================================

    async def get_by_id_for_update(
        self,
        profile_id: UUID,
    ) -> AgentProfile | None:
        return await self.session.scalar(
            select(
                AgentProfile
            )
            .options(
                *self._options()
            )
            .where(
                AgentProfile.id
                == profile_id,
                AgentProfile.deleted_at
                .is_(None),
            )
            .with_for_update()
        )

    # ============================================================
    # PUBLIC APPROVED DIRECTORY
    # ============================================================

    async def list_approved(
        self,
    ) -> list[AgentProfile]:
        result = await self.session.scalars(
            select(
                AgentProfile
            )
            .options(
                *self._options()
            )
            .where(
                AgentProfile.status
                == AgentApplicationStatus.APPROVED,
                AgentProfile.deleted_at
                .is_(None),
            )
            .order_by(
                AgentProfile.approved_at.desc()
            )
        )

        return list(
            result.unique().all()
        )

    # ============================================================
    # ADMIN LIST BY STATUS
    # ============================================================

    async def list_by_status(
        self,
        status: AgentApplicationStatus,
    ) -> list[AgentProfile]:
        result = await self.session.scalars(
            select(
                AgentProfile
            )
            .options(
                *self._options()
            )
            .where(
                AgentProfile.status
                == status,
                AgentProfile.deleted_at
                .is_(None),
            )
            .order_by(
                AgentProfile.submitted_at.asc()
            )
        )

        return list(
            result.unique().all()
        )

    # ============================================================
    # COVERAGE AREAS
    # ============================================================

    async def clear_coverage_areas(
        self,
        profile_id: UUID,
    ) -> None:
        await self.session.execute(
            delete(
                AgentCoverageArea
            ).where(
                AgentCoverageArea.agent_profile_id
                == profile_id
            )
        )