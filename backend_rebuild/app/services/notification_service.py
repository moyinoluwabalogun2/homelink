from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import (
    and_,
    func,
    or_,
    select,
    update,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from app.models.enums import NotificationType
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationMarkAllReadResponse,
    NotificationPage,
    NotificationRead,
)


class NotificationService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
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

        self.session.add(
            notification
        )

        return notification

    # =========================================================
    # LIST NOTIFICATIONS
    #
    # Cursor pagination prevents the frontend from loading an
    # account's complete notification history in one request.
    #
    # noload prevents Notification.user from performing the
    # model's default joined User load.
    # =========================================================

    async def list_page(
        self,
        *,
        user_id: UUID,
        unread_only: bool,
        limit: int,
        before: datetime | None,
        before_id: UUID | None,
    ) -> NotificationPage:
        statement = (
            select(
                Notification
            )
            .options(
                noload(
                    Notification.user
                )
            )
            .where(
                Notification.user_id
                == user_id
            )
        )

        if unread_only:
            statement = statement.where(
                Notification.read_at.is_(
                    None
                )
            )

        if (
            before is not None
            and before_id is not None
        ):
            statement = statement.where(
                or_(
                    Notification.created_at
                    < before,

                    and_(
                        Notification.created_at
                        == before,

                        Notification.id
                        < before_id,
                    ),
                )
            )

        records = list(
            (
                await self.session.scalars(
                    statement
                    .order_by(
                        Notification.created_at.desc(),
                        Notification.id.desc(),
                    )
                    .limit(
                        limit + 1
                    )
                )
            ).all()
        )

        has_more = (
            len(records)
            > limit
        )

        page_records = records[
            :limit
        ]

        last = (
            page_records[-1]
            if page_records
            else None
        )

        return NotificationPage(
            items=[
                NotificationRead.model_validate(
                    item
                )
                for item
                in page_records
            ],
            has_more=has_more,
            next_before=(
                last.created_at
                if (
                    has_more
                    and last is not None
                )
                else None
            ),
            next_before_id=(
                last.id
                if (
                    has_more
                    and last is not None
                )
                else None
            ),
        )

    # =========================================================
    # MARK ALL READ
    # =========================================================

    async def mark_all_read(
        self,
        *,
        user_id: UUID,
    ) -> NotificationMarkAllReadResponse:
        result = await self.session.execute(
            update(
                Notification
            )
            .where(
                Notification.user_id
                == user_id,

                Notification.read_at.is_(
                    None
                ),
            )
            .values(
                read_at=datetime.now(
                    UTC
                )
            )
        )

        await self.session.commit()

        updated_count = int(
            result.rowcount
            or 0
        )

        return NotificationMarkAllReadResponse(
            message=(
                "All notifications were marked as read."
                if updated_count
                else (
                    "No unread notifications remained."
                )
            ),
            updated_count=updated_count,
        )

    # =========================================================
    # MARK ONE READ
    #
    # COALESCE keeps the original read time if the request is
    # repeated, making this endpoint idempotent.
    # =========================================================

    async def mark_read(
        self,
        *,
        user_id: UUID,
        notification_id: UUID,
    ) -> NotificationRead:
        notification = await self.session.scalar(
            update(
                Notification
            )
            .where(
                Notification.id
                == notification_id,

                Notification.user_id
                == user_id,
            )
            .values(
                read_at=func.coalesce(
                    Notification.read_at,
                    datetime.now(
                        UTC
                    ),
                )
            )
            .returning(
                Notification
            )
        )

        if notification is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Notification not found."
                ),
            )

        await self.session.commit()

        return NotificationRead.model_validate(
            notification
        )