from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import (
    AgentCoverageArea,
    AgentProfile,
    AgentVerificationDocument,
)
from app.models.enums import (
    AgentApplicationStatus,
    NotificationType,
    UserRole,
    VerificationDocumentStatus,
)
from app.models.location import Area
from app.models.user import User
from app.repositories.agent_repository import (
    AgentRepository,
)
from app.schemas.agent import (
    AgentApplyRequest,
    AgentDocumentCreate,
    AgentRejectRequest,
)
from app.services.cloudinary_asset_service import (
    CloudinaryAssetService,
)
from app.services.notification_service import (
    NotificationService,
)


class AgentService:
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

        self.repository = AgentRepository(
            session
        )

        self.notifications = (
            NotificationService(
                session
            )
        )

        self.cloudinary_assets = (
            CloudinaryAssetService()
        )

    # ============================================================
    # APPLICATION
    # ============================================================

    async def apply(
        self,
        *,
        user: User,
        payload: AgentApplyRequest,
    ) -> AgentProfile:
        existing = (
            await self.repository.get_by_user_id(
                user.id
            )
        )

        if (
            existing
            and existing.status
            in {
                AgentApplicationStatus.PENDING,
                AgentApplicationStatus.APPROVED,
            }
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "An active agent application "
                    "already exists."
                ),
            )

        areas = await self._load_areas(
            payload.area_ids
        )

        now = datetime.now(
            UTC
        )

        if existing:
            profile = existing

            profile.agent_type = (
                payload.agent_type
            )

            profile.business_name = (
                payload.business_name
            )

            profile.bio = (
                payload.bio
            )

            profile.years_experience = (
                payload.years_experience
            )

            profile.status = (
                AgentApplicationStatus.PENDING
            )

            profile.rejection_reason = None

            profile.submitted_at = now

            profile.approved_at = None

            profile.approved_by_id = None

            await self.repository.clear_coverage_areas(
                profile.id
            )

            # Previous rejected verification documents remain
            # historical records. They are never silently reset
            # to pending during a resubmission.

        else:
            profile = AgentProfile(
                user_id=user.id,
                agent_type=(
                    payload.agent_type
                ),
                business_name=(
                    payload.business_name
                ),
                bio=(
                    payload.bio
                ),
                years_experience=(
                    payload.years_experience
                ),
                status=(
                    AgentApplicationStatus.PENDING
                ),
                submitted_at=now,
            )

            self.session.add(
                profile
            )

            await self.session.flush()

        for area in areas:
            self.session.add(
                AgentCoverageArea(
                    agent_profile_id=(
                        profile.id
                    ),
                    area_id=(
                        area.id
                    ),
                )
            )

        await self.session.commit()

        return await self._reload(
            profile.id
        )

    # ============================================================
    # VERIFICATION DOCUMENTS
    # ============================================================

    async def add_document(
        self,
        *,
        user: User,
        payload: AgentDocumentCreate,
    ) -> AgentProfile:
        profile = (
            await self.repository.get_by_user_id(
                user.id
            )
        )

        if profile is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Agent application not found."
                ),
            )

        # Verification evidence belongs to a live review cycle.
        #
        # Rejected applications must first be resubmitted so the
        # profile becomes PENDING again. Approved applications
        # cannot add documents through this workflow.
        if (
            profile.status
            != AgentApplicationStatus.PENDING
        ):
            if (
                profile.status
                == AgentApplicationStatus.APPROVED
            ):
                detail = (
                    "Approved applications cannot "
                    "add verification documents here."
                )
            else:
                detail = (
                    "Resubmit the application before "
                    "adding a new verification document."
                )

            raise HTTPException(
                status_code=409,
                detail=detail,
            )

        # --------------------------------------------------------
        # VERIFY CLOUDINARY ASSET
        #
        # Never trust:
        # - payload.file_url
        # - payload.file_format
        # - payload.storage_resource_type
        # - payload.storage_delivery_type
        #
        # The browser can modify every one of those.
        #
        # storage_public_id is only used to ask Cloudinary for the
        # authoritative asset metadata.
        # --------------------------------------------------------

        asset = (
            await self.cloudinary_assets
            .verify_agent_document(
                user_id=user.id,
                public_id=(
                    payload.storage_public_id
                ),
            )
        )

        # --------------------------------------------------------
        # DUPLICATE PROTECTION
        #
        # Do not delete the Cloudinary asset if this check finds an
        # existing record. In that situation the physical asset is
        # already owned by an existing HomeLink verification row.
        # --------------------------------------------------------

        existing_document_id = (
            await self.session.scalar(
                select(
                    AgentVerificationDocument.id
                ).where(
                    AgentVerificationDocument.storage_public_id
                    == asset.public_id,
                    AgentVerificationDocument.purged_at
                    .is_(
                        None
                    ),
                )
            )
        )

        if (
            existing_document_id
            is not None
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "This verification document "
                    "has already been submitted."
                ),
            )

        document = (
            AgentVerificationDocument(
                agent_profile_id=(
                    profile.id
                ),
                document_type=(
                    payload.document_type
                ),

                # Authoritative values from Cloudinary only.
                file_url=(
                    asset.secure_url
                ),
                storage_public_id=(
                    asset.public_id
                ),
                file_format=(
                    asset.file_format
                ),
                storage_resource_type=(
                    asset.resource_type
                ),
                storage_delivery_type=(
                    asset.delivery_type
                ),

                status=(
                    VerificationDocumentStatus.PENDING
                ),
                rejection_reason=None,
                reviewed_at=None,
                purged_at=None,
            )
        )

        self.session.add(
            document
        )

        # --------------------------------------------------------
        # ATOMIC REGISTRATION + ORPHAN CLEANUP
        #
        # If the database refuses/fails to register this newly
        # verified asset, roll back the DB transaction and remove
        # the physical Cloudinary asset on a best-effort basis.
        #
        # Cleanup is intentionally limited to failures AFTER the
        # duplicate check succeeds. This prevents us from deleting
        # a Cloudinary asset already referenced by another row.
        # --------------------------------------------------------

        try:
            await self.session.commit()

        except Exception:
            await self.session.rollback()

            await self.cloudinary_assets.delete_verified_agent_document(
                asset
            )

            raise

        # Commit succeeded. From this point onward the asset is
        # registered and must NOT be deleted simply because a
        # response/reload operation later fails.
        return await self._reload(
            profile.id
        )

    # ============================================================
    # ADMIN APPROVAL
    # ============================================================

    async def approve(
        self,
        *,
        profile_id: UUID,
        admin: User,
    ) -> AgentProfile:
        # Lock the application row before checking its state.
        #
        # If two administrators try to approve/reject the same
        # application simultaneously, the second transaction waits
        # for the first and then observes the new committed state.
        profile = (
            await self.repository
            .get_by_id_for_update(
                profile_id
            )
        )

        if profile is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Agent application not found."
                ),
            )

        if (
            profile.status
            == AgentApplicationStatus.APPROVED
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "This application is already approved."
                ),
            )

        if (
            profile.status
            != AgentApplicationStatus.PENDING
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only pending applications "
                    "can be approved."
                ),
            )

        # Only documents belonging to the CURRENT submission
        # are eligible for review.
        pending_documents = [
            document
            for document
            in profile.documents
            if (
                document.status
                == VerificationDocumentStatus.PENDING
                and document.purged_at
                is None
                and document.storage_public_id
                is not None
            )
        ]

        if not pending_documents:
            raise HTTPException(
                status_code=409,
                detail=(
                    "At least one current pending "
                    "verification document is required."
                ),
            )

        now = datetime.now(
            UTC
        )

        profile.status = (
            AgentApplicationStatus.APPROVED
        )

        profile.rejection_reason = None

        profile.approved_at = now

        profile.approved_by_id = (
            admin.id
        )

        if (
            profile.user.role
            != UserRole.AGENT
        ):
            profile.user.role = (
                UserRole.AGENT
            )

            # Existing access tokens must be refreshed because
            # the user's authorization role changed.
            profile.user.auth_version += 1

        for document in pending_documents:
            document.status = (
                VerificationDocumentStatus.APPROVED
            )

            document.rejection_reason = None

            document.reviewed_at = now

        self.notifications.create(
            user_id=(
                profile.user_id
            ),
            notification_type=(
                NotificationType.AGENT_APPROVED
            ),
            title=(
                "Agent application approved"
            ),
            message=(
                "Your HomeLink agent or landlord "
                "application was approved."
            ),
            data={
                "agent_profile_id": str(
                    profile.id
                ),
            },
        )

        await self.session.commit()

        return await self._reload(
            profile.id
        )

    # ============================================================
    # ADMIN REJECTION
    # ============================================================

    async def reject(
        self,
        *,
        profile_id: UUID,
        admin: User,
        payload: AgentRejectRequest,
    ) -> AgentProfile:
        # Use the same row lock as approval so conflicting admin
        # decisions cannot race against the same PENDING state.
        profile = (
            await self.repository
            .get_by_id_for_update(
                profile_id
            )
        )

        if profile is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Agent application not found."
                ),
            )

        if (
            profile.status
            == AgentApplicationStatus.APPROVED
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Approved applications cannot "
                    "be rejected through this flow."
                ),
            )

        if (
            profile.status
            != AgentApplicationStatus.PENDING
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only pending applications "
                    "can be rejected."
                ),
            )

        now = datetime.now(
            UTC
        )

        reason = (
            payload.reason.strip()
        )

        profile.status = (
            AgentApplicationStatus.REJECTED
        )

        profile.rejection_reason = (
            reason
        )

        profile.approved_at = None

        # This field currently doubles as the reviewer ID.
        profile.approved_by_id = (
            admin.id
        )

        if (
            profile.user.role
            == UserRole.AGENT
        ):
            profile.user.role = (
                UserRole.USER
            )

            profile.user.auth_version += 1

        # Reject only documents from the CURRENT review.
        # Historical rejected documents remain untouched.
        for document in profile.documents:
            if (
                document.status
                != VerificationDocumentStatus.PENDING
            ):
                continue

            document.status = (
                VerificationDocumentStatus.REJECTED
            )

            document.rejection_reason = (
                reason
            )

            document.reviewed_at = (
                now
            )

        self.notifications.create(
            user_id=(
                profile.user_id
            ),
            notification_type=(
                NotificationType.AGENT_REJECTED
            ),
            title=(
                "Agent application needs attention"
            ),
            message=(
                "Your agent or landlord application "
                "was not approved."
            ),
            data={
                "agent_profile_id": str(
                    profile.id
                ),
                "reason": (
                    reason
                ),
            },
        )

        await self.session.commit()

        return await self._reload(
            profile.id
        )

    # ============================================================
    # INTERNAL HELPERS
    # ============================================================

    async def _load_areas(
        self,
        area_ids: list[UUID],
    ) -> list[Area]:
        unique_ids = set(
            area_ids
        )

        result = (
            await self.session.scalars(
                select(
                    Area
                ).where(
                    Area.id.in_(
                        unique_ids
                    ),
                    Area.is_active.is_(
                        True
                    ),
                )
            )
        )

        areas = list(
            result.all()
        )

        if (
            len(
                areas
            )
            != len(
                unique_ids
            )
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "One or more coverage areas "
                    "are invalid."
                ),
            )

        return areas

    async def _reload(
        self,
        profile_id: UUID,
    ) -> AgentProfile:
        profile = (
            await self.repository.get_by_id(
                profile_id
            )
        )

        if profile is None:
            raise RuntimeError(
                "Agent profile disappeared "
                "after save."
            )

        return profile