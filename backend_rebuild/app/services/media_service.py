import time
from uuid import UUID

from cloudinary.utils import api_sign_request
from fastapi import HTTPException

from app.core.config import get_settings
from app.schemas.media import (
    MediaDeliveryType,
    MediaResourceType,
    MediaScope,
    MediaUploadSignatureResponse,
)


settings = get_settings()


GENERAL_ALLOWED_FORMATS: dict[
    MediaResourceType,
    str,
] = {
    "image": "jpg,jpeg,png,webp,avif",
    "video": "mp4,webm,mov",
}


AGENT_DOCUMENT_ALLOWED_FORMATS = (
    "jpg,jpeg,png,webp"
)


class MediaService:
    def create_upload_signature(
        self,
        *,
        user_id: UUID,
        resource_type: MediaResourceType,
        scope: MediaScope,
    ) -> MediaUploadSignatureResponse:

        # ========================================================
        # CONFIGURATION
        # ========================================================

        if not settings.cloudinary_enabled:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Media uploads are not configured yet."
                ),
            )

        if (
            not settings.cloudinary_cloud_name
            or not settings.cloudinary_api_key
            or not settings.cloudinary_api_secret
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Media storage configuration is incomplete."
                ),
            )

        # ========================================================
        # SCOPE POLICY
        # ========================================================

        if scope == "agent-documents":
            if resource_type != "image":
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Agent verification documents "
                        "must be image files."
                    ),
                )

            delivery_type: MediaDeliveryType = (
                "authenticated"
            )

            allowed_formats = (
                AGENT_DOCUMENT_ALLOWED_FORMATS
            )

        else:
            delivery_type = "upload"

            allowed_formats = (
                GENERAL_ALLOWED_FORMATS[
                    resource_type
                ]
            )

        # ========================================================
        # FOLDER
        # ========================================================

        base_folder = (
            settings
            .cloudinary_upload_folder
            .strip()
            .strip("/")
            or "homelink"
        )

        folder = (
            f"{base_folder}/"
            f"{scope}/"
            f"{user_id}"
        )

        timestamp = int(
            time.time()
        )

        # ========================================================
        # CLOUDINARY SIGNATURE
        #
        # IMPORTANT:
        #
        # The browser MUST submit these exact same signed
        # parameters:
        #
        # - allowed_formats
        # - folder
        # - timestamp
        # - type
        #
        # file and api_key are NOT included in the signature.
        #
        # We use Cloudinary's own signature helper instead of
        # maintaining our own SHA implementation.
        # ========================================================

        parameters_to_sign = {
            "allowed_formats":
                allowed_formats,

            "folder":
                folder,

            "timestamp":
                timestamp,

            "type":
                delivery_type,
        }

        signature = api_sign_request(
            parameters_to_sign,
            settings.cloudinary_api_secret,
        )

        # ========================================================
        # UPLOAD ENDPOINT
        #
        # The upload operation itself continues to use Cloudinary's
        # standard Upload API endpoint.
        # ========================================================

        upload_url = (
            "https://api.cloudinary.com/"
            "v1_1/"
            f"{settings.cloudinary_cloud_name}/"
            f"{resource_type}/upload"
        )

        return MediaUploadSignatureResponse(
            cloud_name=(
                settings.cloudinary_cloud_name
            ),
            api_key=(
                settings.cloudinary_api_key
            ),
            timestamp=timestamp,
            signature=signature,
            folder=folder,
            resource_type=resource_type,
            delivery_type=delivery_type,
            allowed_formats=allowed_formats,
            upload_url=upload_url,
        )