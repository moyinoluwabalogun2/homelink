from pathlib import Path


ROOT = Path(
    __file__
).resolve().parents[1]


def read_source(
    relative_path: str,
) -> str:
    return (
        ROOT
        / relative_path
    ).read_text(
        encoding="utf-8"
    )


def compact_source(
    source: str,
) -> str:
    return "".join(
        source.split()
    )


def test_public_listing_endpoint_exposes_bounded_discovery_filters() -> None:
    source = read_source(
        "app/api/v1/endpoints/listings.py"
    )

    compact = compact_source(
        source
    )

    assert (
        "category:str|None"
        in compact
    )

    assert (
        '"recommended"'
        in source
    )

    assert (
        '"price_low"'
        in source
    )

    assert (
        '"price_high"'
        in source
    )

    assert (
        "le=100"
        in compact
    )

    assert (
        "offset:int"
        in compact
    )


def test_repository_filters_each_listing_detail_table() -> None:
    source = read_source(
        "app/repositories/listing_repository.py"
    )

    compact = compact_source(
        source
    )

    assert (
        "Listing.rental_details.has("
        in compact
    )

    assert (
        "Listing.buy_property_details.has("
        in compact
    )

    assert (
        "Listing.marketplace_details.has("
        in compact
    )

    assert (
        'sort=="price_low"'
        in compact
    )

    assert (
        'sort=="price_high"'
        in compact
    )

    assert (
        'sort=="newest"'
        in compact
    )

    assert (
        "Listing.id.asc()"
        in compact
    )