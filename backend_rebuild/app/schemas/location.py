from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import ORMModel


class StateRead(ORMModel):
    id: UUID
    country_code: str
    code: str
    name: str
    slug: str


class CityRead(ORMModel):
    id: UUID
    state_id: UUID
    name: str
    slug: str


class UniversityRead(ORMModel):
    id: UUID
    state_id: UUID
    primary_city_id: UUID | None
    name: str
    short_name: str
    slug: str
    website_url: str | None


class CampusRead(ORMModel):
    id: UUID
    university_id: UUID
    city_id: UUID
    name: str
    code: str
    slug: str
    address: str | None
    latitude: Decimal | None
    longitude: Decimal | None


class AreaRead(ORMModel):
    id: UUID
    city_id: UUID
    campus_id: UUID | None
    name: str
    slug: str
    description: str | None
    latitude: Decimal | None
    longitude: Decimal | None


class LocationBootstrapResponse(
    BaseModel,
):
    states: list[StateRead]
    cities: list[CityRead]
    universities: list[UniversityRead]
    campuses: list[CampusRead]
    areas: list[AreaRead]