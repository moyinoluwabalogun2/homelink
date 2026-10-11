from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.api.auth_dependencies import CurrentUser
from app.api.dependencies import DbSession
from app.models.enums import ListingStatus, UserRole
from app.repositories.listing_repository import ListingRepository
from app.schemas.listing import (
    BuyPropertyCreate,
    MarketplaceCreate,
    OwnedListingRead,
    RentalCreate,
)
from app.services.listing_edit_service import ListingEditService


router = APIRouter(
    prefix="/listings",
    tags=["listings"],
)


@router.get(
    "/mine/{listing_id}",
    response_model=OwnedListingRead,
)
async def get_my_listing_for_edit(
    listing_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> OwnedListingRead:
    listing = await ListingRepository(
        session,
    ).get_by_id(listing_id)

    if (
        listing is None
        or listing.deleted_at is not None
    ):
        raise HTTPException(
            status_code=404,
            detail="Listing not found.",
        )

    if (
        current_user.role != UserRole.ADMIN
        and listing.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not own this listing.",
        )

    if listing.status not in {
        ListingStatus.DRAFT,
        ListingStatus.REJECTED,
    }:
        raise HTTPException(
            status_code=409,
            detail=(
                "Only draft or rejected listings "
                "can be opened in the editor."
            ),
        )

    return OwnedListingRead.model_validate(
        listing,
    )


@router.put(
    "/{listing_id}/rental",
    response_model=OwnedListingRead,
)
async def update_rental_draft(
    listing_id: UUID,
    payload: RentalCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> OwnedListingRead:
    listing = await ListingEditService(
        session,
    ).update_rental(
        user=current_user,
        listing_id=listing_id,
        payload=payload,
    )

    return OwnedListingRead.model_validate(
        listing,
    )


@router.put(
    "/{listing_id}/buy-property",
    response_model=OwnedListingRead,
)
async def update_buy_property_draft(
    listing_id: UUID,
    payload: BuyPropertyCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> OwnedListingRead:
    listing = await ListingEditService(
        session,
    ).update_buy_property(
        user=current_user,
        listing_id=listing_id,
        payload=payload,
    )

    return OwnedListingRead.model_validate(
        listing,
    )


@router.put(
    "/{listing_id}/marketplace",
    response_model=OwnedListingRead,
)
async def update_marketplace_draft(
    listing_id: UUID,
    payload: MarketplaceCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> OwnedListingRead:
    listing = await ListingEditService(
        session,
    ).update_marketplace(
        user=current_user,
        listing_id=listing_id,
        payload=payload,
    )

    return OwnedListingRead.model_validate(
        listing,
    )