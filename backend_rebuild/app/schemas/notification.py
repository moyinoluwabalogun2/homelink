from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import NotificationType
from app.schemas.common import ORMModel


class NotificationRead(ORMModel):
    id: UUID
    notification_type: NotificationType
    title: str
    message: str
    data: dict[str, Any]
    read_at: datetime | None
    created_at: datetime


class NotificationPage(BaseModel):
    items: list[NotificationRead]
    has_more: bool
    next_before: datetime | None
    next_before_id: UUID | None


class NotificationMarkAllReadResponse(BaseModel):
    message: str
    updated_count: int