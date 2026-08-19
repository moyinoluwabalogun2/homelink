from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self.session.scalar(select(User).where(User.id == user_id))

    async def get_by_id_for_update(self, user_id: UUID) -> User | None:
        return await self.session.scalar(
            select(User).where(User.id == user_id).with_for_update()
        )

    async def get_by_email(self, email: str) -> User | None:
        return await self.session.scalar(select(User).where(User.email == email.lower()))

    async def get_by_email_for_update(self, email: str) -> User | None:
        return await self.session.scalar(
            select(User).where(User.email == email.lower()).with_for_update()
        )

    async def get_by_phone(self, phone: str) -> User | None:
        return await self.session.scalar(select(User).where(User.phone == phone))

    def add(self, user: User) -> None:
        self.session.add(user)