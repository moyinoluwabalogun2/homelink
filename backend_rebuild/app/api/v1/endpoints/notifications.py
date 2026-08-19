from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import select, update

from app.api.auth_dependencies import CurrentUser
from app.api.dependencies import DbSession
from app.models.notification import Notification
from app.schemas.auth import MessageResponse
from app.schemas.notification import NotificationRead


router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationRead])
async def list_notifications(
    session: DbSession,
    current_user: CurrentUser,
    unread_only: bool = False,
    limit: int = 50,
) -> list[NotificationRead]:
    limit = max(1, min(limit, 100))
    statement = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        statement = statement.where(Notification.read_at.is_(None))
    records = await session.scalars(
        statement.order_by(Notification.created_at.desc()).limit(limit)
    )
    return [NotificationRead.model_validate(item) for item in records.all()]


@router.patch("/read-all", response_model=MessageResponse)
async def mark_all_notifications_read(
    session: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    await session.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
        .values(read_at=datetime.now(UTC))
    )
    await session.commit()
    return MessageResponse(message="All notifications were marked as read.")


@router.patch("/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_read(
    notification_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> NotificationRead:
    notification = await session.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        await session.commit()
    return NotificationRead.model_validate(notification)