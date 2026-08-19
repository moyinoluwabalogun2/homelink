from decimal import Decimal
from uuid import UUID

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
)

from app.api.auth_dependencies import (
    CurrentUser,
)
from app.api.dependencies import DbSession
from app.models.enums import (
    ListingStatus,
    ListingType,
)
from app.repositories.listing_repository import (
    ListingRepository,
)
from app.schemas.listing import (
    BuyPropertyCreate,
    ListingRead,
    MarketplaceCreate,
    RentalCreate,
)
from app.services.listing_service import (
    ListingService,
)


router = APIRouter(
    prefix="/listings",
    tags=["listings"],
)


@router.get(
    "",
    response_model=list[ListingRead],
)
async def list_public_listings(
    session: DbSession,
    listing_type: ListingType | None = None,
    area_id: UUID | None = None,
    min_price: Decimal | None = Query(
        default=None,
        ge=0,
    ),
    max_price: Decimal | None = Query(
        default=None,
        ge=0,
    ),
    q: str | None = Query(
        default=None,
        max_length=120,
    ),
    limit: int = Query(
        default=24,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
) -> list[ListingRead]:
    records = await ListingRepository(
        session
    ).list_public(
        listing_type=listing_type,
        area_id=area_id,
        min_price=min_price,
        max_price=max_price,
        query=q,
        limit=limit,
        offset=offset,
    )

    return [
        ListingRead.model_validate(item)
        for item in records
    ]


@router.get(
    "/mine",
    response_model=list[ListingRead],
)
async def list_my_listings(
    session: DbSession,
    current_user: CurrentUser,
) -> list[ListingRead]:
    records = await ListingRepository(
        session
    ).list_mine(
        current_user.id
    )

    return [
        ListingRead.model_validate(item)
        for item in records
    ]


@router.post(
    "/rentals",
    response_model=ListingRead,
    status_code=201,
)
async def create_rental(
    payload: RentalCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> ListingRead:
    listing = await ListingService(
        session
    ).create_rental(
        user=current_user,
        payload=payload,
    )

    return ListingRead.model_validate(
        listing
    )


@router.post(
    "/buy-properties",
    response_model=ListingRead,
    status_code=201,
)
async def create_buy_property(
    payload: BuyPropertyCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> ListingRead:
    listing = await ListingService(
        session
    ).create_buy_property(
        user=current_user,
        payload=payload,
    )

    return ListingRead.model_validate(
        listing
    )


@router.post(
    "/marketplace",
    response_model=ListingRead,
    status_code=201,
)
async def create_marketplace_item(
    payload: MarketplaceCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> ListingRead:
    listing = await ListingService(
        session
    ).create_marketplace(
        user=current_user,
        payload=payload,
    )

    return ListingRead.model_validate(
        listing
    )


@router.post(
    "/{listing_id}/submit",
    response_model=ListingRead,
)
async def submit_listing(
    listing_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> ListingRead:
    listing = await ListingService(
        session
    ).submit(
        user=current_user,
        listing_id=listing_id,
    )

    return ListingRead.model_validate(
        listing
    )


@router.delete(
    "/{listing_id}",
    status_code=204,
)
async def delete_listing(
    listing_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> None:
    await ListingService(
        session
    ).soft_delete(
        user=current_user,
        listing_id=listing_id,
    )


@router.get(
    "/{listing_id}",
    response_model=ListingRead,
)
async def get_public_listing(
    listing_id: UUID,
    session: DbSession,
) -> ListingRead:
    listing = await ListingRepository(
        session
    ).get_by_id(
        listing_id
    )

    if (
        listing is None
        or listing.status
        != ListingStatus.PUBLISHED
    ):
        raise HTTPException(
            status_code=404,
            detail="Listing not found.",
        )

    return ListingRead.model_validate(
        listing
    )