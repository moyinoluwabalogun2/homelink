from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.auth_dependencies import (
    require_roles,
)
from app.api.dependencies import DbSession
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.listing_repository import (
    ListingRepository,
)
from app.schemas.listing import (
    ListingRead,
    ListingRejectRequest,
)
from app.services.listing_service import (
    ListingService,
)


router = APIRouter(
    prefix="/admin/listings",
    tags=["admin-listings"],
)


AdminUser = Annotated[
    User,
    Depends(
        require_roles(
            UserRole.ADMIN
        )
    ),
]


@router.get(
    "/pending",
    response_model=list[ListingRead],
)
async def list_pending_listings(
    session: DbSession,
    _: AdminUser,
) -> list[ListingRead]:
    records = await ListingRepository(
        session
    ).list_pending()

    return [
        ListingRead.model_validate(item)
        for item in records
    ]


@router.post(
    "/{listing_id}/approve",
    response_model=ListingRead,
)
async def approve_listing(
    listing_id: UUID,
    session: DbSession,
    admin: AdminUser,
) -> ListingRead:
    listing = await ListingService(
        session
    ).approve(
        admin=admin,
        listing_id=listing_id,
    )

    return ListingRead.model_validate(
        listing
    )


@router.post(
    "/{listing_id}/reject",
    response_model=ListingRead,
)
async def reject_listing(
    listing_id: UUID,
    payload: ListingRejectRequest,
    session: DbSession,
    admin: AdminUser,
) -> ListingRead:
    listing = await ListingService(
        session
    ).reject(
        admin=admin,
        listing_id=listing_id,
        reason=payload.reason,
    )

    return ListingRead.model_validate(
        listing
    )