from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.api.auth_dependencies import CurrentUser
from app.api.dependencies import DbSession
from app.models.enums import AgentApplicationStatus
from app.repositories.agent_repository import AgentRepository
from app.schemas.agent import (
    AgentApplyRequest,
    AgentDocumentCreate,
    AgentProfilePublicRead,
    AgentProfileRead,
)
from app.services.agent_service import AgentService


router = APIRouter(
    prefix="/agents",
    tags=["agents"],
)


# ============================================================
# PUBLIC AGENT DIRECTORY
#
# Verification documents are intentionally excluded.
# ============================================================


@router.get(
    "",
    response_model=list[AgentProfilePublicRead],
)
async def list_approved_agents(
    session: DbSession,
) -> list[AgentProfilePublicRead]:
    records = await AgentRepository(
        session
    ).list_approved()

    return [
        AgentProfilePublicRead.model_validate(
            item
        )
        for item in records
    ]


# ============================================================
# PRIVATE CURRENT-USER APPLICATION
#
# The applicant may see their own verification metadata.
# ============================================================


@router.get(
    "/me",
    response_model=AgentProfileRead,
)
async def get_my_agent_profile(
    session: DbSession,
    current_user: CurrentUser,
) -> AgentProfileRead:
    profile = await AgentRepository(
        session
    ).get_by_user_id(
        current_user.id
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Agent application not found."
            ),
        )

    return AgentProfileRead.model_validate(
        profile
    )


# ============================================================
# APPLICATION
# ============================================================


@router.post(
    "/apply",
    response_model=AgentProfileRead,
    status_code=201,
)
async def apply_as_agent(
    payload: AgentApplyRequest,
    session: DbSession,
    current_user: CurrentUser,
) -> AgentProfileRead:
    profile = await AgentService(
        session
    ).apply(
        user=current_user,
        payload=payload,
    )

    return AgentProfileRead.model_validate(
        profile
    )


# ============================================================
# PRIVATE VERIFICATION DOCUMENT REGISTRATION
# ============================================================


@router.post(
    "/me/documents",
    response_model=AgentProfileRead,
    status_code=201,
)
async def add_agent_document(
    payload: AgentDocumentCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> AgentProfileRead:
    profile = await AgentService(
        session
    ).add_document(
        user=current_user,
        payload=payload,
    )

    return AgentProfileRead.model_validate(
        profile
    )


# ============================================================
# PUBLIC AGENT PROFILE
#
# Keep this AFTER the static /me routes so "me" can never be
# interpreted as a UUID profile ID.
# ============================================================


@router.get(
    "/{profile_id}",
    response_model=AgentProfilePublicRead,
)
async def get_public_agent(
    profile_id: UUID,
    session: DbSession,
) -> AgentProfilePublicRead:
    profile = await AgentRepository(
        session
    ).get_by_id(
        profile_id
    )

    if (
        profile is None
        or profile.status
        != AgentApplicationStatus.APPROVED
    ):
        raise HTTPException(
            status_code=404,
            detail=(
                "Approved agent not found."
            ),
        )

    return AgentProfilePublicRead.model_validate(
        profile
    )