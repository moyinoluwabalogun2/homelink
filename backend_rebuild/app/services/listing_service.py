import re

from datetime import (
    UTC,
    datetime,
    timedelta,
)

from uuid import (
    UUID,
    uuid4,
)

from fastapi import (
    HTTPException,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.models.agent import (
    AgentProfile,
)

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
    COMPLETION_UNDO_HOURS = 24

    MEDIA_RECOVERY_DAYS = 30

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

        if listing.listing_type in {
            ListingType.RENTAL,
            ListingType.BUY_PROPERTY,
        }:
            await self._require_approved_agent_or_admin(
                user
            )

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
    # MARK SOLD / RENTED
    # ============================================================

    async def complete(
        self,
        *,
        user: User,
        listing_id: UUID,
    ) -> Listing:
        listing = await self._owned_or_admin(
            user=user,
            listing_id=listing_id,
            for_update=True,
        )

        if (
            listing.status
            != ListingStatus.PUBLISHED
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only a published listing "
                    "can be marked as completed."
                ),
            )

        now = datetime.now(
            UTC
        )

        if (
            listing.listing_type
            == ListingType.RENTAL
        ):
            listing.status = (
                ListingStatus.RENTED
            )

        else:
            listing.status = (
                ListingStatus.SOLD
            )

        listing.completed_at = now

        listing.media_purge_after = (
            now
            + timedelta(
                days=(
                    self.MEDIA_RECOVERY_DAYS
                )
            )
        )

        await self.session.commit()

        return await self._reload(
            listing.id
        )

    # ============================================================
    # UNDO SOLD / RENTED
    # ============================================================

    async def reopen_completed(
        self,
        *,
        user: User,
        listing_id: UUID,
    ) -> Listing:
        listing = await self._owned_or_admin(
            user=user,
            listing_id=listing_id,
            for_update=True,
        )

        if listing.status not in {
            ListingStatus.SOLD,
            ListingStatus.RENTED,
        }:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only a sold or rented listing "
                    "can be reopened."
                ),
            )

        now = datetime.now(
            UTC
        )

        if (
            listing.completed_at
            is None
            or listing.completed_at
            + timedelta(
                hours=(
                    self.COMPLETION_UNDO_HOURS
                )
            )
            < now
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "The 24-hour completion undo "
                    "period has ended."
                ),
            )

        if (
            listing.expires_at
            is not None
            and listing.expires_at
            <= now
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "This listing expired and "
                    "cannot be reopened."
                ),
            )

        listing.status = (
            ListingStatus.PUBLISHED
        )

        listing.completed_at = None
        listing.media_purge_after = None

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

        listing.completed_at = None

        listing.media_purge_after = None

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

        now = datetime.now(
            UTC
        )

        listing.archived_from_status = (
            listing.status.value
        )

        listing.deleted_at = now

        listing.media_purge_after = (
            now
            + timedelta(
                days=(
                    self.MEDIA_RECOVERY_DAYS
                )
            )
        )

        listing.status = (
            ListingStatus.ARCHIVED
        )

        await self.session.commit()

    # ============================================================
    # RESTORE RECENTLY DELETED
    # ============================================================

    async def restore(
        self,
        *,
        user: User,
        listing_id: UUID,
    ) -> Listing:
        listing = (
            await self._owned_deleted_or_admin(
                user=user,
                listing_id=listing_id,
            )
        )

        now = datetime.now(
            UTC
        )

        if (
            listing.media_purge_after
            is None
            or listing.media_purge_after
            <= now
        ):
            raise HTTPException(
                status_code=410,
                detail=(
                    "The 30-day recovery period "
                    "for this listing has ended."
                ),
            )

        try:
            restored_status = (
                ListingStatus(
                    listing.archived_from_status
                )
            )
        except (
            TypeError,
            ValueError,
        ):
            restored_status = (
                ListingStatus.DRAFT
            )

        if (
            restored_status
            == ListingStatus.PUBLISHED
            and listing.expires_at
            is not None
            and listing.expires_at
            <= now
        ):
            restored_status = (
                ListingStatus.EXPIRED
            )

        if (
            restored_status
            == ListingStatus.ARCHIVED
        ):
            restored_status = (
                ListingStatus.DRAFT
            )

        listing.status = (
            restored_status
        )

        listing.deleted_at = None

        listing.archived_from_status = None

        listing.media_purge_after = None

        await self.session.commit()

        return await self._reload(
            listing.id
        )

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

    async def _owned_deleted_or_admin(
        self,
        *,
        user: User,
        listing_id: UUID,
    ) -> Listing:
        listing = (
            await self.repository
            .get_deleted_by_id_for_update(
                listing_id
            )
        )

        if listing is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Deleted listing not found."
                ),
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
        media: list[
            ListingMediaInput
        ],
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