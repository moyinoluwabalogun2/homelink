from datetime import datetime
from uuid import UUID

from app.models.enums import (
    AccountStatus,
    UserRole,
)
from app.schemas.common import ORMModel


class PublicUserRead(ORMModel):
    id: UUID
    full_name: str
    role: UserRole
    profile_image_url: str | None


class UserRead(PublicUserRead):
    email: str
    phone: str
    status: AccountStatus
    is_email_verified: bool
    is_phone_verified: bool
    last_login_at: datetime | None
    marketing_consent: bool
    created_at: datetime
    updated_at: datetime