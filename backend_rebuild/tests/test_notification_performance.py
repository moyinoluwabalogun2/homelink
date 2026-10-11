import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.dialects import postgresql

from app.models.enums import NotificationType
from app.models.notification import Notification
from app.services.notification_service import (
    NotificationService,
)


def test_notification_page_is_bounded_and_does_not_join_user(
) -> None:
    class ScalarResult:
        def all(
            self,
        ) -> list[Notification]:
            return []

    class CaptureSession:
        statement = None

        async def scalars(
            self,
            statement,
        ):
            self.statement = statement

            return ScalarResult()

    session = CaptureSession()

    page = asyncio.run(
        NotificationService(
            session
        ).list_page(
            user_id=uuid4(),
            unread_only=False,
            limit=30,
            before=None,
            before_id=None,
        )
    )

    assert page.items == []
    assert page.has_more is False

    assert (
        session.statement
        is not None
    )

    sql = str(
        session.statement.compile(
            dialect=(
                postgresql.dialect()
            ),
            compile_kwargs={
                "literal_binds": True,
            },
        )
    )

    normalized = " ".join(
        sql.split()
    )

    assert (
        "JOIN users"
        not in normalized
    )

    assert (
        "LIMIT 31"
        in normalized
    )

    assert (
        "ORDER BY notifications.created_at DESC, "
        "notifications.id DESC"
    ) in normalized


def test_mark_all_read_returns_exact_update_count(
) -> None:
    class Result:
        rowcount = 4

    class FakeSession:
        commits = 0

        async def execute(
            self,
            _statement,
        ):
            return Result()

        async def commit(
            self,
        ) -> None:
            self.commits += 1

    session = FakeSession()

    response = asyncio.run(
        NotificationService(
            session
        ).mark_all_read(
            user_id=uuid4(),
        )
    )

    assert (
        response.updated_count
        == 4
    )

    assert (
        session.commits
        == 1
    )


def test_mark_read_is_idempotent_for_an_existing_notification(
) -> None:
    now = datetime.now(
        UTC
    )

    notification = Notification(
        id=uuid4(),
        user_id=uuid4(),
        notification_type=(
            NotificationType.SYSTEM
        ),
        title="Test",
        message="Test notification",
        data={},
        read_at=now,
        created_at=now,
        updated_at=now,
    )

    class FakeSession:
        commits = 0

        async def scalar(
            self,
            _statement,
        ):
            return notification

        async def commit(
            self,
        ) -> None:
            self.commits += 1

    session = FakeSession()

    response = asyncio.run(
        NotificationService(
            session
        ).mark_read(
            user_id=(
                notification.user_id
            ),
            notification_id=(
                notification.id
            ),
        )
    )

    assert (
        response.id
        == notification.id
    )

    assert (
        response.read_at
        == now
    )

    assert (
        session.commits
        == 1
    )