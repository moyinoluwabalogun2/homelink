import asyncio
import logging
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from uuid import UUID

import cloudinary
import cloudinary.api
from sqlalchemy import (
    delete,
    exists,
    or_,
    select,
    update,
)
from sqlalchemy.dialects.postgresql import (
    insert as postgresql_insert,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.listing import (
    Listing,
    ListingMedia,
)
from app.models.media_cleanup import (
    MediaCleanupJob,
)


settings = get_settings()
logger = logging.getLogger(__name__)


class MediaCleanupService:
    JOB_BATCH_SIZE = 100
    EXPIRED_MEDIA_BATCH_SIZE = 300
    UNCLAIMED_UPLOAD_GRACE_HOURS = 24
    MAX_ERROR_LENGTH = 2000

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def enqueue_assets(
        self,
        *,
        assets: list[
            tuple[
                str,
                str,
                str,
                UUID | None,
            ]
        ],
        reason: str,
    ) -> int:
        rows = []

        for (
            public_id,
            resource_type,
            delivery_type,
            listing_id,
        ) in assets:
            cleaned_public_id = (
                public_id.strip()
            )

            if not cleaned_public_id:
                continue

            rows.append(
                {
                    "storage_public_id":
                        cleaned_public_id,
                    "resource_type":
                        resource_type,
                    "delivery_type":
                        delivery_type,
                    "reason":
                        reason,
                    "listing_id":
                        listing_id,
                    "attempts":
                        0,
                }
            )

        if not rows:
            return 0

        statement = (
            postgresql_insert(
                MediaCleanupJob,
            )
            .values(rows)
            .on_conflict_do_nothing(
                constraint=(
                    "uq_media_cleanup_jobs_asset"
                ),
            )
        )

        result = await self.session.execute(
            statement,
        )

        return int(
            result.rowcount or 0,
        )

    async def enqueue_removed_listing_media(
        self,
        *,
        listing_id: UUID,
        old_media: list[
            tuple[str, str]
        ],
        retained_public_ids: set[str],
    ) -> int:
        assets: list[
            tuple[
                str,
                str,
                str,
                UUID | None,
            ]
        ] = []

        for (
            public_id,
            resource_type,
        ) in old_media:
            cleaned_public_id = (
                public_id.strip()
            )

            if (
                not cleaned_public_id
                or cleaned_public_id
                in retained_public_ids
            ):
                continue

            assets.append(
                (
                    cleaned_public_id,
                    resource_type,
                    "upload",
                    listing_id,
                )
            )

        return await self.enqueue_assets(
            assets=assets,
            reason="listing_edit_removed",
        )

    async def enqueue_expired_listing_media(
        self,
        *,
        now: datetime,
    ) -> int:
        result = await self.session.execute(
            select(
                ListingMedia.storage_public_id,
                ListingMedia.media_type,
                ListingMedia.listing_id,
            )
            .join(
                Listing,
                Listing.id
                == ListingMedia.listing_id,
            )
            .where(
                Listing.deleted_at.is_not(
                    None,
                ),
                Listing.media_purge_after.is_not(
                    None,
                ),
                Listing.media_purge_after
                <= now,
                ListingMedia.storage_public_id.is_not(
                    None,
                ),
            )
            .order_by(
                Listing.media_purge_after.asc(),
                ListingMedia.created_at.asc(),
            )
            .limit(
                self.EXPIRED_MEDIA_BATCH_SIZE,
            )
        )

        assets: list[
            tuple[
                str,
                str,
                str,
                UUID | None,
            ]
        ] = []

        for row in result.all():
            public_id = row[0]

            if not isinstance(
                public_id,
                str,
            ):
                continue

            media_type = row[1]

            resource_type = (
                media_type.value
                if hasattr(
                    media_type,
                    "value",
                )
                else str(media_type)
            )

            assets.append(
                (
                    public_id,
                    resource_type,
                    "upload",
                    row[2],
                )
            )

        return await self.enqueue_assets(
            assets=assets,
            reason=(
                "listing_recovery_expired"
            ),
        )

    async def process_pending_jobs(
        self,
        *,
        now: datetime | None = None,
    ) -> int:
        if now is None:
            now = datetime.now(UTC)

        if not self._cloudinary_ready():
            return 0

        unclaimed_cutoff = (
            now
            - timedelta(
                hours=(
                    self.UNCLAIMED_UPLOAD_GRACE_HOURS
                ),
            )
        )

        # Removed media may be processed on the next maintenance
        # run. Unclaimed uploads must be at least 24 hours old.
        result = await self.session.execute(
            select(
                MediaCleanupJob,
            )
            .where(
                or_(
                    MediaCleanupJob.reason
                    != "unclaimed_upload",
                    MediaCleanupJob.created_at
                    <= unclaimed_cutoff,
                )
            )
            .order_by(
                MediaCleanupJob.attempts.asc(),
                MediaCleanupJob.created_at.asc(),
            )
            .limit(
                self.JOB_BATCH_SIZE,
            )
            .with_for_update(
                skip_locked=True,
            )
        )

        jobs = list(
            result.scalars().all(),
        )

        if not jobs:
            await self._finalize_expired_listings(
                now=now,
            )
            return 0

        public_ids = {
            job.storage_public_id
            for job in jobs
        }

        # One query protects every queued public ID in this batch.
        # No N+1 query per file.
        protected_result = (
            await self.session.execute(
                select(
                    ListingMedia.storage_public_id,
                )
                .join(
                    Listing,
                    Listing.id
                    == ListingMedia.listing_id,
                )
                .where(
                    ListingMedia.storage_public_id.in_(
                        public_ids,
                    ),
                    or_(
                        Listing.deleted_at.is_(
                            None,
                        ),
                        Listing.media_purge_after.is_(
                            None,
                        ),
                        Listing.media_purge_after
                        > now,
                    ),
                )
                .distinct()
            )
        )

        protected_public_ids = {
            public_id
            for public_id
            in protected_result.scalars().all()
            if isinstance(
                public_id,
                str,
            )
        }

        protected_job_ids = [
            job.id
            for job in jobs
            if job.storage_public_id
            in protected_public_ids
        ]

        if protected_job_ids:
            # Referenced assets are now claimed. Remove their
            # temporary cleanup records permanently.
            await self.session.execute(
                delete(
                    MediaCleanupJob,
                ).where(
                    MediaCleanupJob.id.in_(
                        protected_job_ids,
                    )
                )
            )

        removable_jobs = [
            job
            for job in jobs
            if job.storage_public_id
            not in protected_public_ids
        ]

        grouped_jobs: dict[
            tuple[str, str],
            list[MediaCleanupJob],
        ] = defaultdict(list)

        for job in removable_jobs:
            grouped_jobs[
                (
                    job.resource_type,
                    job.delivery_type,
                )
            ].append(job)

        successful_job_ids: list[UUID] = []
        successful_public_ids: set[str] = set()

        for (
            resource_type,
            delivery_type,
        ), group in grouped_jobs.items():
            group_public_ids = list(
                {
                    job.storage_public_id
                    for job in group
                }
            )

            try:
                response = (
                    await self._delete_cloudinary_assets(
                        public_ids=group_public_ids,
                        resource_type=resource_type,
                        delivery_type=delivery_type,
                    )
                )
            except Exception as error:
                logger.exception(
                    "Cloudinary listing media cleanup failed.",
                )

                await self._record_group_failure(
                    jobs=group,
                    error=error,
                )
                continue

            deleted_map = response.get(
                "deleted",
                {},
            )

            if not isinstance(
                deleted_map,
                dict,
            ):
                await self._record_group_failure(
                    jobs=group,
                    error=RuntimeError(
                        "Unexpected Cloudinary deletion response.",
                    ),
                )
                continue

            completed_public_ids = {
                public_id
                for public_id, status
                in deleted_map.items()
                if status in {
                    "deleted",
                    "not_found",
                }
            }

            successful_public_ids.update(
                completed_public_ids,
            )

            successful_job_ids.extend(
                job.id
                for job in group
                if job.storage_public_id
                in completed_public_ids
            )

            incomplete_jobs = [
                job
                for job in group
                if job.storage_public_id
                not in completed_public_ids
            ]

            if incomplete_jobs:
                await self._record_group_failure(
                    jobs=incomplete_jobs,
                    error=RuntimeError(
                        "Cloudinary did not confirm asset deletion.",
                    ),
                )

        if successful_public_ids:
            await self.session.execute(
                delete(
                    ListingMedia,
                ).where(
                    ListingMedia.storage_public_id.in_(
                        successful_public_ids,
                    )
                )
            )

        if successful_job_ids:
            await self.session.execute(
                delete(
                    MediaCleanupJob,
                ).where(
                    MediaCleanupJob.id.in_(
                        successful_job_ids,
                    )
                )
            )

        await self._finalize_expired_listings(
            now=now,
        )

        return len(
            successful_job_ids,
        )

    async def _finalize_expired_listings(
        self,
        *,
        now: datetime,
    ) -> int:
        eligible_result = (
            await self.session.execute(
                select(
                    Listing.id,
                )
                .where(
                    Listing.deleted_at.is_not(
                        None,
                    ),
                    Listing.media_purge_after.is_not(
                        None,
                    ),
                    Listing.media_purge_after
                    <= now,
                    ~exists(
                        select(
                            MediaCleanupJob.id,
                        ).where(
                            MediaCleanupJob.listing_id
                            == Listing.id,
                        )
                    ),
                    ~exists(
                        select(
                            ListingMedia.id,
                        ).where(
                            ListingMedia.listing_id
                            == Listing.id,
                            ListingMedia.storage_public_id.is_not(
                                None,
                            ),
                        )
                    ),
                )
                .limit(
                    self.EXPIRED_MEDIA_BATCH_SIZE,
                )
            )
        )

        listing_ids = list(
            eligible_result.scalars().all(),
        )

        if not listing_ids:
            return 0

        await self.session.execute(
            delete(
                ListingMedia,
            ).where(
                ListingMedia.listing_id.in_(
                    listing_ids,
                )
            )
        )

        result = await self.session.execute(
            update(
                Listing,
            )
            .where(
                Listing.id.in_(
                    listing_ids,
                )
            )
            .values(
                media_purge_after=None,
            )
        )

        return int(
            result.rowcount or 0,
        )

    async def _record_group_failure(
        self,
        *,
        jobs: list[MediaCleanupJob],
        error: Exception,
    ) -> None:
        if not jobs:
            return

        message = str(error)[
            : self.MAX_ERROR_LENGTH
        ]

        await self.session.execute(
            update(
                MediaCleanupJob,
            )
            .where(
                MediaCleanupJob.id.in_(
                    [
                        job.id
                        for job in jobs
                    ]
                )
            )
            .values(
                attempts=(
                    MediaCleanupJob.attempts
                    + 1
                ),
                last_error=message,
                updated_at=datetime.now(
                    UTC,
                ),
            )
        )

    async def _delete_cloudinary_assets(
        self,
        *,
        public_ids: list[str],
        resource_type: str,
        delivery_type: str,
    ) -> dict:
        self._configure_cloudinary()

        response = await asyncio.to_thread(
            cloudinary.api.delete_resources,
            public_ids,
            resource_type=resource_type,
            type=delivery_type,
            invalidate=True,
        )

        if not isinstance(
            response,
            dict,
        ):
            raise RuntimeError(
                "Cloudinary returned an invalid response.",
            )

        return response

    def _configure_cloudinary(
        self,
    ) -> None:
        cloudinary.config(
            cloud_name=(
                settings.cloudinary_cloud_name
            ),
            api_key=(
                settings.cloudinary_api_key
            ),
            api_secret=(
                settings.cloudinary_api_secret
            ),
            secure=True,
        )

    def _cloudinary_ready(
        self,
    ) -> bool:
        return bool(
            settings.cloudinary_enabled
            and settings.cloudinary_cloud_name
            and settings.cloudinary_api_key
            and settings.cloudinary_api_secret
        )