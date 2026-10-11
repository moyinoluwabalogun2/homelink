from importlib.util import (
    module_from_spec,
    spec_from_file_location,
)
from pathlib import Path
from unittest.mock import call, patch


migration_path = (
    Path(__file__).parents[1]
    / "alembic"
    / "versions"
    / "20260926_0013_query_performance_indexes.py"
)

spec = spec_from_file_location(
    "query_performance_migration",
    migration_path,
)

assert spec is not None
assert spec.loader is not None

migration = module_from_spec(spec)
spec.loader.exec_module(migration)


def test_performance_migration_is_on_current_chain() -> None:
    assert migration.revision == "20260926_0013"
    assert migration.down_revision == "20260922_0012"


def test_upgrade_creates_all_bounded_query_indexes() -> None:
    with patch.object(
        migration.op,
        "create_index",
    ) as create_index:
        migration.upgrade()

    assert create_index.call_count == 6

    names = {
        index_call.args[0]
        for index_call in create_index.call_args_list
    }

    assert names == {
        "ix_listings_public_discovery",
        "ix_listings_owner_active_created",
        "ix_listings_owner_deleted_recovery",
        "ix_saved_listings_user_created",
        "ix_listing_reports_reporter_created",
        "ix_agent_profiles_status_created",
    }


def test_downgrade_removes_indexes_in_reverse_order() -> None:
    with patch.object(
        migration.op,
        "drop_index",
    ) as drop_index:
        migration.downgrade()

    assert drop_index.call_args_list == [
        call(
            "ix_agent_profiles_status_created",
            table_name="agent_profiles",
        ),
        call(
            "ix_listing_reports_reporter_created",
            table_name="listing_reports",
        ),
        call(
            "ix_saved_listings_user_created",
            table_name="saved_listings",
        ),
        call(
            "ix_listings_owner_deleted_recovery",
            table_name="listings",
        ),
        call(
            "ix_listings_owner_active_created",
            table_name="listings",
        ),
        call(
            "ix_listings_public_discovery",
            table_name="listings",
        ),
    ]