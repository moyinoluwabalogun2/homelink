from uuid import UUID

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
)

from app.api.auth_dependencies import (
    CurrentUser,
)

from app.api.dependencies import (
    DbSession,
)

from app.models.enums import (
    AgentApplicationStatus,
)

from app.repositories.agent_repository import (
    AgentRepository,
)

from app.schemas.agent import (
    AgentApplyRequest,
    AgentDocumentCreate,
    AgentProfilePublicRead,
    AgentProfileRead,
)

from app.services.agent_service import (
    AgentService,
)


router = APIRouter(
    prefix="/agents",
    tags=[
        "agents",
    ],
)


# ============================================================
# PUBLIC APPROVED AGENT DIRECTORY
# ============================================================


@router.get(
    "",
    response_model=list[
        AgentProfilePublicRead
    ],
)
async def list_approved_agents(
    session: DbSession,
    limit: int = Query(
        default=24,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
) -> list[AgentProfilePublicRead]:
    records = (
        await AgentRepository(
            session
        ).list_approved(
            limit=limit,
            offset=offset,
        )
    )

    return [
        AgentProfilePublicRead
        .model_validate(
            item
        )
        for item in records
    ]


# ============================================================
# CURRENT USER AGENT APPLICATION
# ============================================================


@router.get(
    "/me",
    response_model=AgentProfileRead,
)
async def get_my_agent_profile(
    session: DbSession,
    current_user: CurrentUser,
) -> AgentProfileRead:
    profile = (
        await AgentRepository(
            session
        ).get_by_user_id(
            current_user.id
        )
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Agent application "
                "not found."
            ),
        )

    return AgentProfileRead.model_validate(
        profile
    )


# ============================================================
# AGENT APPLICATION
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
# VERIFICATION DOCUMENT REGISTRATION
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
# PUBLIC SINGLE AGENT PROFILE
#
# Keep this after the static /me routes so FastAPI never
# interprets "me" as a UUID profile ID.
# ============================================================


@router.get(
    "/{profile_id}",
    response_model=AgentProfilePublicRead,
)
async def get_public_agent(
    profile_id: UUID,
    session: DbSession,
) -> AgentProfilePublicRead:
    profile = (
        await AgentRepository(
            session
        ).get_by_id(
            profile_id
        )
    )

    if (
        profile is None
        or profile.status
        != AgentApplicationStatus.APPROVED
    ):
        raise HTTPException(
            status_code=404,
            detail=(
                "Approved agent "
                "not found."
            ),
        )

    return (
        AgentProfilePublicRead
        .model_validate(
            profile
        )
    )