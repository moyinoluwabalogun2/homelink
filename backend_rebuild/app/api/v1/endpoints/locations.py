from uuid import UUID

from fastapi import APIRouter

from app.api.dependencies import DbSession
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
from app.services.location_service import (
    LocationService,
)


router = APIRouter(
    prefix="/locations",
    tags=["locations"],
)


def build_service(
    session: DbSession,
) -> LocationService:
    repository = LocationRepository(
        session=session
    )

    return LocationService(
        repository=repository
    )


@router.get(
    "/bootstrap",
    response_model=LocationBootstrapResponse,
    summary=(
        "Return all active location "
        "reference data"
    ),
)
async def get_location_bootstrap(
    session: DbSession,
) -> LocationBootstrapResponse:
    service = build_service(session)

    return await service.get_bootstrap_data()


@router.get(
    "/states",
    response_model=list[StateRead],
)
async def get_states(
    session: DbSession,
) -> list[StateRead]:
    service = build_service(session)

    return await service.get_states()


@router.get(
    "/cities",
    response_model=list[CityRead],
)
async def get_cities(
    session: DbSession,
    state_id: UUID | None = None,
) -> list[CityRead]:
    service = build_service(session)

    return await service.get_cities(
        state_id=state_id
    )


@router.get(
    "/universities",
    response_model=list[UniversityRead],
)
async def get_universities(
    session: DbSession,
    state_id: UUID | None = None,
) -> list[UniversityRead]:
    service = build_service(session)

    return await service.get_universities(
        state_id=state_id
    )


@router.get(
    "/campuses",
    response_model=list[CampusRead],
)
async def get_campuses(
    session: DbSession,
    university_id: UUID | None = None,
    city_id: UUID | None = None,
) -> list[CampusRead]:
    service = build_service(session)

    return await service.get_campuses(
        university_id=university_id,
        city_id=city_id,
    )


@router.get(
    "/areas",
    response_model=list[AreaRead],
)
async def get_areas(
    session: DbSession,
    city_id: UUID | None = None,
    campus_id: UUID | None = None,
) -> list[AreaRead]:
    service = build_service(session)

    return await service.get_areas(
        city_id=city_id,
        campus_id=campus_id,
    )