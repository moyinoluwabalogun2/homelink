from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.models.location import (
    Area,
    Campus,
    City,
    State,
    University,
)


class LocationRepository:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def list_states(
        self,
    ) -> list[State]:
        statement = (
            select(State)
            .where(
                State.is_active.is_(True)
            )
            .order_by(
                State.sort_order,
                State.name,
            )
        )

        result = await self.session.scalars(
            statement
        )

        return list(result.all())

    async def list_cities(
        self,
        state_id: UUID | None = None,
    ) -> list[City]:
        statement = select(City).where(
            City.is_active.is_(True)
        )

        if state_id is not None:
            statement = statement.where(
                City.state_id == state_id
            )

        statement = statement.order_by(
            City.sort_order,
            City.name,
        )

        result = await self.session.scalars(
            statement
        )

        return list(result.all())

    async def list_universities(
        self,
        state_id: UUID | None = None,
    ) -> list[University]:
        statement = select(
            University
        ).where(
            University.is_active.is_(True)
        )

        if state_id is not None:
            statement = statement.where(
                University.state_id
                == state_id
            )

        statement = statement.order_by(
            University.sort_order,
            University.name,
        )

        result = await self.session.scalars(
            statement
        )

        return list(result.all())

    async def list_campuses(
        self,
        university_id: (
            UUID | None
        ) = None,
        city_id: UUID | None = None,
    ) -> list[Campus]:
        statement = select(Campus).where(
            Campus.is_active.is_(True)
        )

        if university_id is not None:
            statement = statement.where(
                Campus.university_id
                == university_id
            )

        if city_id is not None:
            statement = statement.where(
                Campus.city_id == city_id
            )

        statement = statement.order_by(
            Campus.sort_order,
            Campus.name,
        )

        result = await self.session.scalars(
            statement
        )

        return list(result.all())

    async def list_areas(
        self,
        city_id: UUID | None = None,
        campus_id: UUID | None = None,
    ) -> list[Area]:
        statement = select(Area).where(
            Area.is_active.is_(True)
        )

        if city_id is not None:
            statement = statement.where(
                Area.city_id == city_id
            )

        if campus_id is not None:
            statement = statement.where(
                Area.campus_id == campus_id
            )

        statement = statement.order_by(
            Area.sort_order,
            Area.name,
        )

        result = await self.session.scalars(
            statement
        )

        return list(result.all())