from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import AccountStatus, UserRole
from app.schemas.common import ORMModel


class MessageResponse(BaseModel):
    message: str


class EmailVerificationConfirmRequest(BaseModel):
    token: str = Field(min_length=20, max_length=500)


class DataExportRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)


class AccountDeleteRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    confirm_delete: Literal[True]


class LegalDocumentResponse(BaseModel):
    document_type: Literal["privacy", "terms", "cookie"]
    version: str
    effective_date: str
    is_draft: bool
    contact_email: EmailStr
    content_markdown: str


class AdminUserRead(ORMModel):
    id: UUID
    full_name: str
    email: str
    phone: str
    role: UserRole
    status: AccountStatus
    is_email_verified: bool
    email_verified_at: datetime | None
    deleted_at: datetime | None
    anonymized_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AdminUserStatusUpdate(BaseModel):
    status: AccountStatus
    reason: str | None = Field(default=None, max_length=2000)


class AdminUserRoleUpdate(BaseModel):
    role: UserRole
    reason: str | None = Field(default=None, max_length=2000)


class AuditLogRead(ORMModel):
    id: UUID
    actor_user_id: UUID | None
    action: str
    target_type: str | None
    target_id: str | None
    request_id: str
    ip_address: str | None
    user_agent: str | None
    status_code: int | None
    details: dict[str, Any]
    created_at: datetime


class MaintenanceResult(BaseModel):
    expired_listings: int
    deleted_sessions: int
    deleted_password_reset_tokens: int
    deleted_email_verification_tokens: int
    deleted_notifications: int
    deleted_webhook_events: int
    deleted_audit_logs: int
    purged_agent_verification_documents: int