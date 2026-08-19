from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.models.enums import (
    AgentApplicationStatus,
    AgentType,
    VerificationDocumentStatus,
    VerificationDocumentType,
)
from app.schemas.common import ORMModel
from app.schemas.location import AreaRead
from app.schemas.user import PublicUserRead


class AgentApplyRequest(BaseModel):
    agent_type: AgentType

    business_name: str | None = Field(
        default=None,
        max_length=180,
    )

    bio: str = Field(
        min_length=40,
        max_length=3000,
    )

    years_experience: int = Field(
        ge=0,
        le=80,
    )

    area_ids: list[UUID] = Field(
        min_length=1,
        max_length=20,
    )


class AgentDocumentCreate(BaseModel):
    document_type: VerificationDocumentType

    file_url: HttpUrl

    storage_public_id: str = Field(
        min_length=1,
        max_length=255,
    )

    file_format: str | None = Field(
        default=None,
        max_length=32,
    )

    storage_resource_type: str = Field(
        default="image",
        max_length=16,
    )

    storage_delivery_type: str = Field(
        default="authenticated",
        max_length=32,
    )


class AgentRejectRequest(BaseModel):
    reason: str = Field(
        min_length=10,
        max_length=2000,
    )


class AgentCoverageAreaRead(ORMModel):
    area: AreaRead


class AgentDocumentRead(ORMModel):
    id: UUID
    document_type: VerificationDocumentType
    file_url: str | None
    status: VerificationDocumentStatus
    rejection_reason: str | None
    created_at: datetime
    reviewed_at: datetime | None
    purged_at: datetime | None


class AgentDocumentAccessResponse(BaseModel):
    url: str
    expires_in_seconds: int
    download: bool


class AgentProfilePublicRead(ORMModel):
    """
    Public agent profile.

    Verification documents are never exposed here.
    """

    id: UUID
    user: PublicUserRead
    agent_type: AgentType
    business_name: str | None
    bio: str
    years_experience: int
    status: AgentApplicationStatus
    approved_at: datetime | None
    coverage_areas: list[AgentCoverageAreaRead]


class AgentProfileRead(ORMModel):
    """
    Private application view for applicant/admin.
    """

    id: UUID
    user: PublicUserRead
    agent_type: AgentType
    business_name: str | None
    bio: str
    years_experience: int
    status: AgentApplicationStatus
    rejection_reason: str | None
    submitted_at: datetime
    approved_at: datetime | None
    coverage_areas: list[AgentCoverageAreaRead]
    documents: list[AgentDocumentRead]