import re
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentProfile
from app.models.enums import (
    AgentApplicationStatus,
    ListingStatus,
    ListingType,
    MediaType,
    NotificationType,
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
from app.repositories.agent_repository import (
    AgentRepository,
)
from app.repositories.listing_repository import (
    ListingRepository,
)
from app.schemas.listing import (
    BuyPropertyCreate,
    ListingMediaInput,
    MarketplaceCreate,
    RentalCreate,
)
from app.services.credit_service import (
    CreditService,
)
from app.services.notification_service import (
    NotificationService,
)


def slugify(
    value: str,
) -> str:
    cleaned = re.sub(
        r"[^a-z0-9]+",
        "-",
        value.lower(),
    ).strip("-")

    return (
        cleaned
        or "listing"
    )


class ListingService:
    MEDIA_LIMITS = {
        ListingType.RENTAL: (
            8,
            1,
        ),
        ListingType.BUY_PROPERTY: (
            8,
            1,
        ),
        ListingType.MARKETPLACE: (
            5,
            1,
        ),
    }

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

        self.repository = (
            ListingRepository(
                session
            )
        )

        self.agent_repository = (
            AgentRepository(
                session
            )
        )

        self.credits = (
            CreditService(
                session
            )
        )

        self.notifications = (
            NotificationService(
                session
            )
        )

    # ============================================================
    # CREATE RENTAL
    # ============================================================

    async def create_rental(
        self,
        *,
        user: User,
        payload: RentalCreate,
    ) -> Listing:
        await self._require_approved_agent_or_admin(
            user
        )

        listing = self._build_listing(
            user=user,
            listing_type=(
                ListingType.RENTAL
            ),
            payload=payload,
        )

        listing.rental_details = (
            RentalDetails(
                category=(
                    payload.category
                ),
                rent_period=(
                    payload.rent_period
                ),
                bedrooms=(
                    payload.bedrooms
                ),
                bathrooms=(
                    payload.bathrooms
                ),
                toilets=(
                    payload.toilets
                ),
                is_furnished=(
                    payload.is_furnished
                ),
                caution_fee=(
                    payload.caution_fee
                ),
                service_charge=(
                    payload.service_charge
                ),
                distance_to_campus_km=(
                    payload.distance_to_campus_km
                ),
                address=(
                    payload.address
                ),
            )
        )

        await self._save(
            listing
        )

        return await self._reload(
            listing.id
        )

    # ============================================================
    # CREATE PROPERTY
    # ============================================================

    async def create_buy_property(
        self,
        *,
        user: User,
        payload: BuyPropertyCreate,
    ) -> Listing:
        await self._require_approved_agent_or_admin(
            user
        )

        listing = self._build_listing(
            user=user,
            listing_type=(
                ListingType.BUY_PROPERTY
            ),
            payload=payload,
        )

        listing.buy_property_details = (
            BuyPropertyDetails(
                category=(
                    payload.category
                ),
                property_condition=(
                    payload.property_condition
                ),
                bedrooms=(
                    payload.bedrooms
                ),
                bathrooms=(
                    payload.bathrooms
                ),
                toilets=(
                    payload.toilets
                ),
                land_size_sqm=(
                    payload.land_size_sqm
                ),
                title_document=(
                    payload.title_document
                ),
                address=(
                    payload.address
                ),
            )
        )

        await self._save(
            listing
        )

        return await self._reload(
            listing.id
        )

    # ============================================================
    # CREATE MARKETPLACE
    # ============================================================

    async def create_marketplace(
        self,
        *,
        user: User,
        payload: MarketplaceCreate,
    ) -> Listing:
        listing = self._build_listing(
            user=user,
            listing_type=(
                ListingType.MARKETPLACE
            ),
            payload=payload,
        )

        listing.marketplace_details = (
            MarketplaceDetails(
                category=(
                    payload.category
                ),
                condition=(
                    payload.condition
                ),
                is_negotiable=(
                    payload.is_negotiable
                ),
            )
        )

        await self._save(
            listing
        )

        return await self._reload(
            listing.id
        )

    # ============================================================
    # SUBMIT FOR MODERATION
    # ============================================================

    async def submit(
        self,
        *,
        user: User,
        listing_id: UUID,
    ) -> Listing:
        # Lock the listing FIRST.
        #
        # This prevents two simultaneous submit requests from
        # seeing the same DRAFT state and charging two credits.
        listing = await self._owned_or_admin(
            user=user,
            listing_id=listing_id,
            for_update=True,
        )

        if listing.status not in {
            ListingStatus.DRAFT,
            ListingStatus.REJECTED,
        }:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only draft or rejected "
                    "listings can be submitted."
                ),
            )

        # Re-check authorization at submission time.
        #
        # An approved agent may create a property draft and later
        # lose the AGENT role before submitting it. Creation-time
        # authorization alone is therefore insufficient.
        if listing.listing_type in {
            ListingType.RENTAL,
            ListingType.BUY_PROPERTY,
        }:
            await self._require_approved_agent_or_admin(
                user
            )

        # The UI promises at least one IMAGE, not merely any media.
        has_image = any(
            media.media_type
            == MediaType.IMAGE
            for media in listing.media
        )

        if not has_image:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Add at least one image "
                    "before submitting."
                ),
            )

        # Credit mutation and listing state transition remain in
        # the same database transaction.
        await self.credits.consume_for_listing(
            user=user,
            listing=listing,
        )

        listing.status = (
            ListingStatus.PENDING
        )

        listing.rejection_reason = None

        await self.session.commit()

        return await self._reload(
            listing.id
        )

    # ============================================================
    # ADMIN APPROVE
    # ============================================================

    async def approve(
        self,
        *,
        admin: User,
        listing_id: UUID,
    ) -> Listing:
        listing = (
            await self.repository
            .get_by_id_for_update(
                listing_id
            )
        )

        if listing is None:
            raise HTTPException(
                status_code=404,
                detail="Listing not found.",
            )

        if (
            listing.status
            != ListingStatus.PENDING
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only pending listings "
                    "can be approved."
                ),
            )

        now = datetime.now(
            UTC
        )

        listing.status = (
            ListingStatus.PUBLISHED
        )

        listing.approved_at = now

        listing.approved_by_id = (
            admin.id
        )

        listing.published_at = now

        listing.rejection_reason = None

        if (
            listing.listing_type
            == ListingType.RENTAL
        ):
            listing.expires_at = (
                now
                + timedelta(
                    days=30
                )
            )

        elif (
            listing.listing_type
            == ListingType.BUY_PROPERTY
        ):
            listing.expires_at = (
                now
                + timedelta(
                    days=60
                )
            )

        self.notifications.create(
            user_id=(
                listing.owner_id
            ),
            notification_type=(
                NotificationType.LISTING_APPROVED
            ),
            title=(
                "Listing approved"
            ),
            message=(
                f'Your listing "{listing.title}" '
                "is now published."
            ),
            data={
                "listing_id": str(
                    listing.id
                ),
            },
        )

        await self.session.commit()

        return await self._reload(
            listing.id
        )

    # ============================================================
    # ADMIN REJECT
    # ============================================================

    async def reject(
        self,
        *,
        admin: User,
        listing_id: UUID,
        reason: str,
    ) -> Listing:
        listing = (
            await self.repository
            .get_by_id_for_update(
                listing_id
            )
        )

        if listing is None:
            raise HTTPException(
                status_code=404,
                detail="Listing not found.",
            )

        if (
            listing.status
            != ListingStatus.PENDING
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only pending listings "
                    "can be rejected."
                ),
            )

        now = datetime.now(
            UTC
        )

        listing.status = (
            ListingStatus.REJECTED
        )

        listing.rejection_reason = (
            reason
        )

        listing.approved_by_id = (
            admin.id
        )

        listing.approved_at = now

        self.notifications.create(
            user_id=(
                listing.owner_id
            ),
            notification_type=(
                NotificationType.LISTING_REJECTED
            ),
            title=(
                "Listing needs changes"
            ),
            message=(
                f'Your listing "{listing.title}" '
                "was not approved."
            ),
            data={
                "listing_id": str(
                    listing.id
                ),
                "reason": reason,
            },
        )

        await self.session.commit()

        return await self._reload(
            listing.id
        )

    # ============================================================
    # SOFT DELETE
    # ============================================================

    async def soft_delete(
        self,
        *,
        user: User,
        listing_id: UUID,
    ) -> None:
        listing = await self._owned_or_admin(
            user=user,
            listing_id=listing_id,
            for_update=True,
        )

        listing.deleted_at = (
            datetime.now(
                UTC
            )
        )

        listing.status = (
            ListingStatus.ARCHIVED
        )

        await self.session.commit()

    # ============================================================
    # BUILD
    # ============================================================

    def _build_listing(
        self,
        *,
        user: User,
        listing_type: ListingType,
        payload: (
            RentalCreate
            | BuyPropertyCreate
            | MarketplaceCreate
        ),
    ) -> Listing:
        self._validate_media(
            listing_type,
            payload.media,
        )

        listing_id = uuid4()

        listing = Listing(
            id=listing_id,
            owner_id=user.id,
            area_id=(
                payload.area_id
            ),
            campus_id=(
                payload.campus_id
            ),
            listing_type=(
                listing_type
            ),
            title=(
                payload.title.strip()
            ),
            slug=(
                f"{slugify(payload.title)}-"
                f"{str(listing_id)[:8]}"
            ),
            description=(
                payload.description.strip()
            ),
            price=(
                payload.price
            ),
            status=(
                ListingStatus.DRAFT
            ),
        )

        listing.media = [
            ListingMedia(
                media_type=(
                    item.media_type
                ),
                url=str(
                    item.url
                ),
                storage_public_id=(
                    item.storage_public_id
                ),
                sort_order=(
                    item.sort_order
                ),
                is_cover=(
                    item.is_cover
                ),
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
            listing.media[
                0
            ].is_cover = True

        return listing

    # ============================================================
    # SAVE / RELOAD
    # ============================================================

    async def _save(
        self,
        listing: Listing,
    ) -> None:
        self.session.add(
            listing
        )

        await self.session.commit()

    async def _reload(
        self,
        listing_id: UUID,
    ) -> Listing:
        listing = (
            await self.repository.get_by_id(
                listing_id
            )
        )

        if listing is None:
            raise RuntimeError(
                "Listing disappeared after save."
            )

        return listing

    # ============================================================
    # OWNERSHIP
    # ============================================================

    async def _owned_or_admin(
        self,
        *,
        user: User,
        listing_id: UUID,
        for_update: bool = False,
    ) -> Listing:
        if for_update:
            listing = (
                await self.repository
                .get_by_id_for_update(
                    listing_id
                )
            )

        else:
            listing = (
                await self.repository
                .get_by_id(
                    listing_id
                )
            )

        if listing is None:
            raise HTTPException(
                status_code=404,
                detail="Listing not found.",
            )

        if (
            user.role
            != UserRole.ADMIN
            and listing.owner_id
            != user.id
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not own this listing."
                ),
            )

        return listing

    # ============================================================
    # PROPERTY POSTING AUTHORIZATION
    # ============================================================

    async def _require_approved_agent_or_admin(
        self,
        user: User,
    ) -> AgentProfile | None:
        if (
            user.role
            == UserRole.ADMIN
        ):
            return None

        if (
            user.role
            != UserRole.AGENT
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Only approved agents, landlords "
                    "or administrators can post "
                    "property listings."
                ),
            )

        profile = (
            await self.agent_repository
            .get_by_user_id(
                user.id
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

    # ============================================================
    # MEDIA LIMITS
    # ============================================================

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
            item.media_type
            == MediaType.IMAGE
            for item in media
        )

        video_count = sum(
            item.media_type
            == MediaType.VIDEO
            for item in media
        )

        if (
            image_count
            > max_images
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "This listing type allows "
                    f"at most {max_images} images."
                ),
            )

        if (
            video_count
            > max_videos
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "This listing type allows "
                    f"at most {max_videos} videos."
                ),
            )

        if (
            sum(
                item.is_cover
                for item in media
            )
            > 1
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Only one media item may "
                    "be the cover."
                ),
            )