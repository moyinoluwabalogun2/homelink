from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import NotificationType
from app.models.notification import Notification


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def create(
        self,
        *,
        user_id: UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        data: dict[str, Any] | None = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data or {},
        )
        self.session.add(notification)
        return notification