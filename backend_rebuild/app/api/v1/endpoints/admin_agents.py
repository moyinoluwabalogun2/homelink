from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from sqlalchemy import select

from app.api.auth_dependencies import require_roles
from app.api.dependencies import DbSession
from app.models.agent import AgentVerificationDocument
from app.models.enums import (
    AgentApplicationStatus,
    UserRole,
)
from app.models.user import User
from app.repositories.agent_repository import AgentRepository
from app.schemas.agent import (
    AgentDocumentAccessResponse,
    AgentProfileRead,
    AgentRejectRequest,
)
from app.services.agent_service import AgentService
from app.services.cloudinary_asset_service import (
    CloudinaryAssetService,
)


router = APIRouter(
    prefix="/admin/agent-applications",
    tags=["admin-agents"],
)

AdminUser = Annotated[
    User,
    Depends(
        require_roles(
            UserRole.ADMIN
        )
    ),
]


# ============================================================
# LIST APPLICATIONS
# ============================================================


@router.get(
    "",
    response_model=list[AgentProfileRead],
)
async def list_agent_applications(
    session: DbSession,
    _: AdminUser,
    status: AgentApplicationStatus = Query(
        default=AgentApplicationStatus.PENDING,
    ),
) -> list[AgentProfileRead]:
    records = await AgentRepository(
        session
    ).list_by_status(
        status
    )

    return [
        AgentProfileRead.model_validate(
            item
        )
        for item in records
    ]


# ============================================================
# TEMPORARY DOCUMENT ACCESS
# ============================================================


@router.get(
    "/{profile_id}/documents/{document_id}/access",
    response_model=AgentDocumentAccessResponse,
)
async def access_agent_document(
    profile_id: UUID,
    document_id: UUID,
    session: DbSession,
    _: AdminUser,
    download: bool = Query(
        default=False,
    ),
) -> AgentDocumentAccessResponse:
    """
    Generate a short-lived signed URL for one verification file.

    This endpoint is admin-only.

    The permanent Cloudinary credentials are never exposed.
    """

    document = (
        await session.execute(
            select(
                AgentVerificationDocument
            ).where(
                AgentVerificationDocument.id
                == document_id,
                AgentVerificationDocument.agent_profile_id
                == profile_id,
            )
        )
    ).scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Verification document "
                "not found."
            ),
        )

    if (
        document.purged_at is not None
        or document.storage_public_id is None
    ):
        raise HTTPException(
            status_code=410,
            detail=(
                "This verification file "
                "has already been removed "
                "from storage."
            ),
        )

    if not document.file_format:
        raise HTTPException(
            status_code=409,
            detail=(
                "This verification file "
                "does not have enough storage "
                "metadata for secure access."
            ),
        )

    if (
        document.storage_delivery_type
        != "authenticated"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "This older verification file "
                "was not stored as a protected "
                "authenticated asset."
            ),
        )

    expires_in_seconds = 300

    url = (
        CloudinaryAssetService()
        .create_agent_document_access_url(
            public_id=(
                document.storage_public_id
            ),
            file_format=(
                document.file_format
            ),
            resource_type=(
                document.storage_resource_type
            ),
            delivery_type=(
                document.storage_delivery_type
            ),
            attachment=download,
            expires_in_seconds=(
                expires_in_seconds
            ),
        )
    )

    return AgentDocumentAccessResponse(
        url=url,
        expires_in_seconds=(
            expires_in_seconds
        ),
        download=download,
    )


# ============================================================
# APPROVE
# ============================================================


@router.post(
    "/{profile_id}/approve",
    response_model=AgentProfileRead,
)
async def approve_agent(
    profile_id: UUID,
    session: DbSession,
    admin: AdminUser,
) -> AgentProfileRead:
    profile = await AgentService(
        session
    ).approve(
        profile_id=profile_id,
        admin=admin,
    )

    return AgentProfileRead.model_validate(
        profile
    )


# ============================================================
# REJECT
# ============================================================


@router.post(
    "/{profile_id}/reject",
    response_model=AgentProfileRead,
)
async def reject_agent(
    profile_id: UUID,
    payload: AgentRejectRequest,
    session: DbSession,
    admin: AdminUser,
) -> AgentProfileRead:
    profile = await AgentService(
        session
    ).reject(
        profile_id=profile_id,
        admin=admin,
        payload=payload,
    )

    return AgentProfileRead.model_validate(
        profile
    )