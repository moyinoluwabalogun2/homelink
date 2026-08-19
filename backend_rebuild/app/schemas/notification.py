from datetime import datetime
from typing import Any
from uuid import UUID

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