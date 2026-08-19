import asyncio
import time
from dataclasses import dataclass
from urllib.parse import quote
from uuid import UUID

import cloudinary
import cloudinary.api
import httpx
from cloudinary.utils import private_download_url
from fastapi import HTTPException

from app.core.config import get_settings


settings = get_settings()


MAX_AGENT_DOCUMENT_BYTES = 10 * 1024 * 1024

ALLOWED_AGENT_DOCUMENT_FORMATS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
}


@dataclass(frozen=True)
class VerifiedAgentDocumentAsset:
    public_id: str
    secure_url: str
    file_format: str
    resource_type: str
    delivery_type: str
    bytes: int


class CloudinaryAssetService:
    # ============================================================
    # VERIFY AGENT DOCUMENT
    # ============================================================

    async def verify_agent_document(
        self,
        *,
        user_id: UUID,
        public_id: str,
    ) -> VerifiedAgentDocumentAsset:
        """
        Verify the uploaded verification asset using Cloudinary's
        server-side Admin API.

        The browser-provided URL, format, size and delivery type are
        never trusted.

        Requirements:
        - asset must exist
        - authenticated delivery only
        - image resource only
        - must belong to this user
        - JPG/JPEG/PNG/WebP only
        - maximum 10 MB
        """

        self._ensure_configured()

        clean_public_id = public_id.strip()

        if not clean_public_id:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Verification document "
                    "public ID is required."
                ),
            )

        expected_folder = (
            f"{settings.cloudinary_upload_folder}"
            f"/agent-documents/{user_id}"
        )

        encoded_public_id = quote(
            clean_public_id,
            safe="/",
        )

        url = (
            "https://api.cloudinary.com/"
            "v1_1/"
            f"{settings.cloudinary_cloud_name}/"
            "resources/"
            "image/"
            "authenticated/"
            f"{encoded_public_id}"
        )

        try:
            async with httpx.AsyncClient(
                timeout=10.0,
            ) as client:
                response = await client.get(
                    url,
                    auth=(
                        settings.cloudinary_api_key,
                        settings.cloudinary_api_secret,
                    ),
                )

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cloudinary could not be "
                    "reached to verify the document."
                ),
            ) from exc

        if response.status_code == 404:
            raise HTTPException(
                status_code=422,
                detail=(
                    "The uploaded verification "
                    "document could not be found."
                ),
            )

        if response.status_code == 420:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cloudinary verification is "
                    "temporarily rate limited."
                ),
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=503,
                detail=(
                    "The verification document "
                    "could not be validated."
                ),
            )

        try:
            asset = response.json()

        except ValueError as exc:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cloudinary returned an "
                    "invalid verification response."
                ),
            ) from exc

        returned_public_id = asset.get(
            "public_id",
        )

        resource_type = asset.get(
            "resource_type",
        )

        delivery_type = asset.get(
            "type",
        )

        secure_url = asset.get(
            "secure_url",
        )

        asset_folder = asset.get(
            "asset_folder",
        )

        raw_format = asset.get(
            "format",
        )

        raw_bytes = asset.get(
            "bytes",
        )

        # --------------------------------------------------------
        # ASSET IDENTITY
        # --------------------------------------------------------

        if (
            not isinstance(
                returned_public_id,
                str,
            )
            or returned_public_id
            != clean_public_id
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Verification document "
                    "identity mismatch."
                ),
            )

        # --------------------------------------------------------
        # MUST BE AUTHENTICATED IMAGE
        # --------------------------------------------------------

        if (
            resource_type != "image"
            or delivery_type
            != "authenticated"
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Verification documents must "
                    "be protected authenticated images."
                ),
            )

        # --------------------------------------------------------
        # OWNERSHIP
        # --------------------------------------------------------

        belongs_to_user = False

        if (
            isinstance(
                asset_folder,
                str,
            )
            and asset_folder
            == expected_folder
        ):
            belongs_to_user = True

        if returned_public_id.startswith(
            f"{expected_folder}/",
        ):
            belongs_to_user = True

        if not belongs_to_user:
            raise HTTPException(
                status_code=403,
                detail=(
                    "This verification document "
                    "does not belong to your "
                    "HomeLink upload area."
                ),
            )

        # --------------------------------------------------------
        # FORMAT VALIDATION
        # --------------------------------------------------------

        if not isinstance(
            raw_format,
            str,
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Verification document format "
                    "could not be validated."
                ),
            )

        file_format = (
            raw_format
            .strip()
            .lower()
        )

        if (
            file_format
            not in ALLOWED_AGENT_DOCUMENT_FORMATS
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Verification documents must "
                    "be JPG, PNG or WebP images."
                ),
            )

        # --------------------------------------------------------
        # FILE SIZE VALIDATION
        # --------------------------------------------------------

        if (
            not isinstance(
                raw_bytes,
                int,
            )
            or isinstance(
                raw_bytes,
                bool,
            )
            or raw_bytes <= 0
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Verification document size "
                    "could not be validated."
                ),
            )

        if (
            raw_bytes
            > MAX_AGENT_DOCUMENT_BYTES
        ):
            raise HTTPException(
                status_code=413,
                detail=(
                    "Verification documents must "
                    "be 10 MB or smaller."
                ),
            )

        # --------------------------------------------------------
        # SECURE URL
        # --------------------------------------------------------

        if not isinstance(
            secure_url,
            str,
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Verification document has "
                    "no valid Cloudinary asset URL."
                ),
            )

        return VerifiedAgentDocumentAsset(
            public_id=returned_public_id,
            secure_url=secure_url,
            file_format=file_format,
            resource_type=resource_type,
            delivery_type=delivery_type,
            bytes=raw_bytes,
        )

    # ============================================================
    # CLEAN UP UNREGISTERED VERIFIED ASSET
    # ============================================================

    async def delete_verified_agent_document(
        self,
        asset: VerifiedAgentDocumentAsset,
    ) -> bool:
        """
        Best-effort cleanup for a verified Cloudinary asset that
        could not be registered in HomeLink's database.

        This prevents authenticated verification uploads from
        becoming permanent orphaned storage objects.
        """

        self._ensure_configured()

        if (
            asset.resource_type != "image"
            or asset.delivery_type
            != "authenticated"
        ):
            return False

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

        try:
            result = await asyncio.to_thread(
                cloudinary.api.delete_resources,
                [
                    asset.public_id,
                ],
                resource_type="image",
                type="authenticated",
                invalidate=True,
            )

        except Exception:
            return False

        deleted = result.get(
            "deleted",
            {},
        )

        status = deleted.get(
            asset.public_id,
        )

        return status in {
            "deleted",
            "not_found",
        }

    # ============================================================
    # TEMPORARY ADMIN ACCESS
    # ============================================================

    def create_agent_document_access_url(
        self,
        *,
        public_id: str,
        file_format: str,
        resource_type: str = "image",
        delivery_type: str = "authenticated",
        attachment: bool = False,
        expires_in_seconds: int = 300,
    ) -> str:
        """
        Generate a short-lived signed URL for an admin.

        Default expiry: 5 minutes.
        Maximum expiry: 15 minutes.

        No Cloudinary API secret is sent to the frontend.
        """

        self._ensure_configured()

        if not public_id.strip():
            raise HTTPException(
                status_code=404,
                detail=(
                    "Verification file is "
                    "no longer available."
                ),
            )

        if not file_format.strip():
            raise HTTPException(
                status_code=409,
                detail=(
                    "Verification file format "
                    "is unavailable."
                ),
            )

        if resource_type != "image":
            raise HTTPException(
                status_code=409,
                detail=(
                    "This verification file "
                    "has an unsupported resource type."
                ),
            )

        if (
            delivery_type
            != "authenticated"
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "This verification file is "
                    "not stored as a protected asset."
                ),
            )

        clean_format = (
            file_format
            .strip()
            .lower()
        )

        if (
            clean_format
            not in ALLOWED_AGENT_DOCUMENT_FORMATS
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "This verification file "
                    "has an unsupported format."
                ),
            )

        expires_in_seconds = max(
            60,
            min(
                expires_in_seconds,
                900,
            ),
        )

        expires_at = (
            int(time.time())
            + expires_in_seconds
        )

        try:
            return private_download_url(
                public_id.strip(),
                clean_format,
                resource_type=resource_type,
                type=delivery_type,
                attachment=attachment,
                expires_at=expires_at,
                cloud_name=(
                    settings.cloudinary_cloud_name
                ),
                api_key=(
                    settings.cloudinary_api_key
                ),
                api_secret=(
                    settings.cloudinary_api_secret
                ),
            )

        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Temporary verification "
                    "document access could not "
                    "be generated."
                ),
            ) from exc

    # ============================================================
    # CONFIG
    # ============================================================

    def _ensure_configured(
        self,
    ) -> None:
        if (
            not settings.cloudinary_enabled
            or not settings.cloudinary_cloud_name
            or not settings.cloudinary_api_key
            or not settings.cloudinary_api_secret
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cloudinary verification "
                    "is not configured."
                ),
            )