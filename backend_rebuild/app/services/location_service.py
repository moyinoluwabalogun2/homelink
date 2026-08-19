from uuid import UUID

from app.repositories.location_repository import (
    LocationRepository,
)
from app.schemas.location import (
    AreaRead,
    CampusRead,
    CityRead,
    LocationBootstrapResponse,
    StateRead,
    UniversityRead,
)


class LocationService:
    def __init__(
        self,
        repository: LocationRepository,
    ) -> None:
        self.repository = repository

    async def get_bootstrap_data(
        self,
    ) -> LocationBootstrapResponse:
        states = (
            await self.repository.list_states()
        )

        cities = (
            await self.repository.list_cities()
        )

        universities = (
            await self.repository
            .list_universities()
        )

        campuses = (
            await self.repository
            .list_campuses()
        )

        areas = (
            await self.repository.list_areas()
        )

        return LocationBootstrapResponse(
            states=[
                StateRead.model_validate(item)
                for item in states
            ],
            cities=[
                CityRead.model_validate(item)
                for item in cities
            ],
            universities=[
                UniversityRead.model_validate(
                    item
                )
                for item in universities
            ],
            campuses=[
                CampusRead.model_validate(item)
                for item in campuses
            ],
            areas=[
                AreaRead.model_validate(item)
                for item in areas
            ],
        )

    async def get_states(
        self,
    ) -> list[StateRead]:
        records = (
            await self.repository.list_states()
        )

        return [
            StateRead.model_validate(record)
            for record in records
        ]

    async def get_cities(
        self,
        state_id: UUID | None,
    ) -> list[CityRead]:
        records = (
            await self.repository.list_cities(
                state_id=state_id
            )
        )

        return [
            CityRead.model_validate(record)
            for record in records
        ]

    async def get_universities(
        self,
        state_id: UUID | None,
    ) -> list[UniversityRead]:
        records = (
            await self.repository
            .list_universities(
                state_id=state_id
            )
        )

        return [
            UniversityRead.model_validate(
                record
            )
            for record in records
        ]

    async def get_campuses(
        self,
        university_id: UUID | None,
        city_id: UUID | None,
    ) -> list[CampusRead]:
        records = (
            await self.repository.list_campuses(
                university_id=university_id,
                city_id=city_id,
            )
        )

        return [
            CampusRead.model_validate(record)
            for record in records
        ]

    async def get_areas(
        self,
        city_id: UUID | None,
        campus_id: UUID | None,
    ) -> list[AreaRead]:
        records = (
            await self.repository.list_areas(
                city_id=city_id,
                campus_id=campus_id,
            )
        )

        return [
            AreaRead.model_validate(record)
            for record in records
        ]