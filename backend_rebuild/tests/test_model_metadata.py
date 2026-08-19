import app.models  # noqa: F401

from app.db.base import Base


EXPECTED_TABLES = {
    "areas",
    "auth_sessions",
    "campuses",
    "cities",
    "states",
    "universities",
    "users",
}


def test_foundation_tables_registered(
) -> None:
    registered_tables = set(
        Base.metadata.tables.keys()
    )

    assert EXPECTED_TABLES.issubset(
        registered_tables
    )