from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentProfile
from app.models.enums import (
    AgentApplicationStatus,
    ListingStatus,
    ListingType,
    MediaType,
    UserRole,
)
from app.models.listing import (
    BuyPropertyDetails,
    Listing,
    ListingMedia,
    MarketplaceDetails,
    RentalDetails,
)
from app.models.user import User
from app.repositories.agent_repository import AgentRepository
from app.repositories.listing_repository import ListingRepository
from app.schemas.listing import (
    BuyPropertyCreate,
    ListingBaseCreate,
    ListingMediaInput,
    MarketplaceCreate,
    RentalCreate,
)
from app.services.media_cleanup_service import MediaCleanupService


class ListingEditService:
    MEDIA_LIMITS = {
        ListingType.RENTAL: (8, 1),
        ListingType.BUY_PROPERTY: (8, 1),
        ListingType.MARKETPLACE: (5, 1),
    }

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session
        self.repository = ListingRepository(
            session,
        )
        self.agent_repository = AgentRepository(
            session,
        )
        self.media_cleanup = MediaCleanupService(
            session,
        )

    async def update_rental(
        self,
        *,
        user: User,
        listing_id: UUID,
        payload: RentalCreate,
    ) -> Listing:
        await self._require_approved_agent_or_admin(
            user,
        )

        listing = await self._editable(
            user=user,
            listing_id=listing_id,
            expected_type=ListingType.RENTAL,
        )

        await self._replace_common(
            listing,
            payload,
        )

        details = listing.rental_details

        if details is None:
            details = RentalDetails()
            listing.rental_details = details

        details.category = payload.category
        details.rent_period = payload.rent_period
        details.bedrooms = payload.bedrooms
        details.bathrooms = payload.bathrooms
        details.toilets = payload.toilets
        details.is_furnished = payload.is_furnished
        details.caution_fee = payload.caution_fee
        details.service_charge = payload.service_charge
        details.distance_to_campus_km = (
            payload.distance_to_campus_km
        )
        details.address = payload.address.strip()

        return await self._commit_and_reload(
            listing,
        )

    async def update_buy_property(
        self,
        *,
        user: User,
        listing_id: UUID,
        payload: BuyPropertyCreate,
    ) -> Listing:
        await self._require_approved_agent_or_admin(
            user,
        )

        listing = await self._editable(
            user=user,
            listing_id=listing_id,
            expected_type=ListingType.BUY_PROPERTY,
        )

        await self._replace_common(
            listing,
            payload,
        )

        details = listing.buy_property_details

        if details is None:
            details = BuyPropertyDetails()
            listing.buy_property_details = details

        details.category = payload.category
        details.property_condition = (
            payload.property_condition
        )
        details.bedrooms = payload.bedrooms
        details.bathrooms = payload.bathrooms
        details.toilets = payload.toilets
        details.land_size_sqm = (
            payload.land_size_sqm
        )
        details.title_document = (
            payload.title_document
        )
        details.address = payload.address.strip()

        return await self._commit_and_reload(
            listing,
        )

    async def update_marketplace(
        self,
        *,
        user: User,
        listing_id: UUID,
        payload: MarketplaceCreate,
    ) -> Listing:
        listing = await self._editable(
            user=user,
            listing_id=listing_id,
            expected_type=ListingType.MARKETPLACE,
        )

        await self._replace_common(
            listing,
            payload,
        )

        details = listing.marketplace_details

        if details is None:
            details = MarketplaceDetails()
            listing.marketplace_details = details

        details.category = payload.category
        details.condition = payload.condition
        details.is_negotiable = (
            payload.is_negotiable
        )

        return await self._commit_and_reload(
            listing,
        )

    async def _editable(
        self,
        *,
        user: User,
        listing_id: UUID,
        expected_type: ListingType,
    ) -> Listing:
        listing = await self.repository.get_by_id_for_update(
            listing_id,
        )

        if listing is None:
            raise HTTPException(
                status_code=404,
                detail="Listing not found.",
            )

        if listing.deleted_at is not None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Restore this listing before editing it."
                ),
            )

        if (
            user.role != UserRole.ADMIN
            and listing.owner_id != user.id
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not own this listing.",
            )

        if listing.listing_type != expected_type:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This update route does not match "
                    "the listing type."
                ),
            )

        if listing.status not in {
            ListingStatus.DRAFT,
            ListingStatus.REJECTED,
        }:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only draft or rejected listings "
                    "can be edited."
                ),
            )

        return listing

    async def _replace_common(
        self,
        listing: Listing,
        payload: ListingBaseCreate,
    ) -> None:
        self._validate_media(
            listing.listing_type,
            payload.media,
        )

        old_media: list[
            tuple[str, str]
        ] = []

        for media in listing.media:
            if not media.storage_public_id:
                continue

            resource_type = (
                media.media_type.value
                if hasattr(
                    media.media_type,
                    "value",
                )
                else str(media.media_type)
            )

            old_media.append(
                (
                    media.storage_public_id,
                    resource_type,
                )
            )

        retained_public_ids = {
            item.storage_public_id.strip()
            for item in payload.media
            if (
                item.storage_public_id
                and item.storage_public_id.strip()
            )
        }

        # Queued inside the same transaction as the edit.
        # If the edit fails, the cleanup job also rolls back.
        await self.media_cleanup.enqueue_removed_listing_media(
            listing_id=listing.id,
            old_media=old_media,
            retained_public_ids=retained_public_ids,
        )

        listing.area_id = payload.area_id
        listing.campus_id = payload.campus_id
        listing.title = payload.title.strip()
        listing.description = (
            payload.description.strip()
        )
        listing.price = payload.price

        # Correcting a rejected listing returns it to Draft.
        listing.status = ListingStatus.DRAFT
        listing.rejection_reason = None
        listing.completed_at = None
        listing.media_purge_after = None

        listing.media = [
            ListingMedia(
                media_type=item.media_type,
                url=str(item.url),
                storage_public_id=(
                    item.storage_public_id
                ),
                sort_order=item.sort_order,
                is_cover=item.is_cover,
            )
            for item in payload.media
        ]

        if (
            listing.media
            and not any(
                item.is_cover
                for item in listing.media
            )
        ):
            listing.media[0].is_cover = True

    async def _commit_and_reload(
        self,
        listing: Listing,
    ) -> Listing:
        listing_id = listing.id

        await self.session.commit()

        refreshed = await self.repository.get_by_id(
            listing_id,
        )

        if refreshed is None:
            raise RuntimeError(
                "Listing disappeared after update.",
            )

        return refreshed

    async def _require_approved_agent_or_admin(
        self,
        user: User,
    ) -> AgentProfile | None:
        if user.role == UserRole.ADMIN:
            return None

        if user.role != UserRole.AGENT:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Only approved agents, landlords "
                    "or administrators can edit "
                    "property listings."
                ),
            )

        profile = (
            await self.agent_repository
            .get_by_user_id(
                user.id,
            )
        )

        if (
            profile is None
            or profile.status
            != AgentApplicationStatus.APPROVED
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Approved agent verification "
                    "is required."
                ),
            )

        return profile

    def _validate_media(
        self,
        listing_type: ListingType,
        media: list[ListingMediaInput],
    ) -> None:
        max_images, max_videos = (
            self.MEDIA_LIMITS[
                listing_type
            ]
        )

        image_count = sum(
            item.media_type == MediaType.IMAGE
            for item in media
        )

        video_count = sum(
            item.media_type == MediaType.VIDEO
            for item in media
        )

        if image_count > max_images:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"This listing type allows at most "
                    f"{max_images} images."
                ),
            )

        if video_count > max_videos:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"This listing type allows at most "
                    f"{max_videos} videos."
                ),
            )

        if sum(
            item.is_cover
            for item in media
        ) > 1:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Only one media item may be the cover."
                ),
            )