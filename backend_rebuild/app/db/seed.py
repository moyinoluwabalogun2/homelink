from app.core.asyncio_compat import (
    run_async,
)
from typing import Any, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.db.base import Base
from app.db.session import (
    AsyncSessionFactory,
    dispose_database_engine,
)
from app.models.location import (
    Area,
    Campus,
    City,
    State,
    University,
)


ModelType = TypeVar(
    "ModelType",
    bound=Base,
)


async def get_or_create(
    session: AsyncSession,
    model: type[ModelType],
    *,
    defaults: dict[str, Any] | None = None,
    **filters: Any,
) -> ModelType:
    statement = select(model).filter_by(
        **filters
    )

    existing = await session.scalar(
        statement
    )

    values = defaults or {}

    if existing is not None:
        for field_name, value in values.items():
            setattr(
                existing,
                field_name,
                value,
            )

        await session.flush()

        return existing

    instance = model(
        **filters,
        **values,
    )

    session.add(instance)

    await session.flush()

    return instance


async def seed_locations(
    session: AsyncSession,
) -> None:
    ogun = await get_or_create(
        session,
        State,
        country_code="NG",
        code="OG",
        defaults={
            "name": "Ogun State",
            "slug": "ogun",
            "is_active": True,
            "sort_order": 1,
        },
    )

    city_definitions = [
        {
            "name": "Ago-Iwoye",
            "slug": "ago-iwoye",
            "sort_order": 1,
        },
        {
            "name": "Ijebu-Ode",
            "slug": "ijebu-ode",
            "sort_order": 2,
        },
        {
            "name": "Ijebu-Igbo",
            "slug": "ijebu-igbo",
            "sort_order": 3,
        },
            {
        "name": "Oru",
        "slug": "oru",
        "sort_order": 4,
    },
        {
            "name": "Ibogun",
            "slug": "ibogun",
            "sort_order": 5,
        },
        {
            "name": "Shagamu",
            "slug": "shagamu",
            "sort_order": 6,
        },
    ]

    cities: dict[str, City] = {}

    for definition in city_definitions:
        city = await get_or_create(
            session,
            City,
            state_id=ogun.id,
            slug=definition["slug"],
            defaults={
                "name": definition["name"],
                "is_active": True,
                "sort_order": (
                    definition["sort_order"]
                ),
            },
        )

        cities[definition["slug"]] = city

    oou = await get_or_create(
        session,
        University,
        state_id=ogun.id,
        slug=(
            "olabisi-onabanjo-university"
        ),
        defaults={
            "primary_city_id": (
                cities["ago-iwoye"].id
            ),
            "name": (
                "Olabisi Onabanjo University"
            ),
            "short_name": "OOU",
            "website_url": None,
            "is_active": True,
            "sort_order": 1,
        },
    )

    campus_definitions = [
        {
            "city_slug": "ago-iwoye",
            "name": "Main Campus",
            "code": "MAIN",
            "slug": "main-campus",
            "sort_order": 1,
        },
        {
            "city_slug": "ibogun",
            "name": "Engineering Campus",
            "code": "IBOGUN",
            "slug": "engineering-campus",
            "sort_order": 2,
        },
        {
            "city_slug": "shagamu",
            "name": (
                "Health Sciences Campus"
            ),
            "code": "SHAGAMU",
            "slug": (
                "health-sciences-campus"
            ),
            "sort_order": 3,
        },
    ]

    campuses: dict[str, Campus] = {}

    for definition in campus_definitions:
        campus = await get_or_create(
            session,
            Campus,
            university_id=oou.id,
            code=definition["code"],
            defaults={
                "city_id": cities[
                    definition["city_slug"]
                ].id,
                "name": definition["name"],
                "slug": definition["slug"],
                "address": None,
                "latitude": None,
                "longitude": None,
                "is_active": True,
                "sort_order": (
                    definition["sort_order"]
                ),
            },
        )

        campuses[
            definition["city_slug"]
        ] = campus

    area_definitions = [
        {
            "city_slug": "ago-iwoye",
            "campus_slug": "ago-iwoye",
            "name": "Ago-Iwoye",
            "slug": "ago-iwoye",
            "description": (
                "Student rentals and "
                "properties around OOU's "
                "main campus community."
            ),
            "sort_order": 1,
        },
        {
            "city_slug": "ijebu-ode",
            "campus_slug": None,
            "name": "Ijebu-Ode",
            "slug": "ijebu-ode",
            "description": (
                "Rentals, property and "
                "marketplace listings "
                "across Ijebu-Ode."
            ),
            "sort_order": 2,
        },
        {
            "city_slug": "ijebu-igbo",
            "campus_slug": None,
            "name": "Ijebu-Igbo",
            "slug": "ijebu-igbo",
            "description": (
                "Housing and marketplace "
                "listings around "
                "Ijebu-Igbo."
            ),
            "sort_order": 3,
        },
        {
    "city_slug": "oru",
    "campus_slug": None,
    "name": "Oru",
    "slug": "oru",
    "description": (
        "Rentals, properties and "
        "marketplace listings "
        "across Oru."
    ),
    "sort_order": 4,
},
        {
            "city_slug": "ibogun",
            "campus_slug": "ibogun",
            "name": "Ibogun",
            "slug": "ibogun",
            "description": (
                "Accommodation around "
                "OOU's engineering campus."
            ),
            "sort_order": 5,
        },
        {
            "city_slug": "shagamu",
            "campus_slug": "shagamu",
            "name": "Shagamu",
            "slug": "shagamu",
            "description": (
                "Accommodation around "
                "OOU's health sciences "
                "campus."
            ),
            "sort_order": 6,
        },
    ]

    for definition in area_definitions:
        campus_slug = definition[
            "campus_slug"
        ]

        campus_id = (
            campuses[campus_slug].id
            if campus_slug is not None
            else None
        )

        await get_or_create(
            session,
            Area,
            city_id=cities[
                definition["city_slug"]
            ].id,
            slug=definition["slug"],
            defaults={
                "campus_id": campus_id,
                "name": definition["name"],
                "description": (
                    definition["description"]
                ),
                "latitude": None,
                "longitude": None,
                "is_active": True,
                "sort_order": (
                    definition["sort_order"]
                ),
            },
        )


async def main() -> None:
    async with (
        AsyncSessionFactory()
        as session
    ):
        try:
            await seed_locations(session)

            await session.commit()

            print(
                "HomeLink location seed "
                "completed successfully."
            )

        except Exception:
            await session.rollback()
            raise

        finally:
            await (
                dispose_database_engine()
            )


if __name__ == "__main__":
    run_async(main())