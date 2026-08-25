from hashlib import sha1
import time
from uuid import UUID

from fastapi import HTTPException

from app.core.config import get_settings

from app.schemas.media import (
    MediaDeliveryType,
    MediaResourceType,
    MediaScope,
    MediaUploadSignatureResponse,
)


settings = get_settings()


ALLOWED_FORMATS: dict[
    MediaResourceType,
    str,
] = {
    "image":
        "jpg,jpeg,png,webp,avif",

    "video":
        "mp4,webm,mov",
}


class MediaService:
    def create_upload_signature(
        self,
        *,
        user_id: UUID,
        resource_type:
            MediaResourceType,
        scope:
            MediaScope,
    ) -> MediaUploadSignatureResponse:

        # ========================================================
        # CONFIGURATION
        # ========================================================

        if not settings.cloudinary_enabled:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Media uploads are "
                    "not configured yet."
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
                    "Media storage "
                    "configuration is incomplete."
                ),
            )

        # ========================================================
        # SCOPE RULES
        # ========================================================

        # Agent verification documents are deliberately restricted
        # to protected images.
        #
        # Cloudinary `authenticated` delivery prevents direct public
        # access to both the original file and derived assets.
        if (
            scope == "agent-documents"
            and resource_type != "image"
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Agent verification documents "
                    "must be image files."
                ),
            )

        delivery_type: MediaDeliveryType

        if scope == "agent-documents":
            delivery_type = (
                "authenticated"
            )
        else:
            delivery_type = (
                "upload"
            )

        # ========================================================
        # UPLOAD PARAMETERS
        # ========================================================

        timestamp = int(
            time.time()
        )

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

        allowed_formats = (
            ALLOWED_FORMATS[
                resource_type
            ]
        )

        # IMPORTANT:
        #
        # Every Cloudinary upload option sent by the browser that
        # participates in authentication must also be included in
        # the signature.
        #
        # `type` is what changes agent documents from the default
        # public `upload` delivery type to `authenticated`.
        parameters: dict[
            str,
            str | int,
        ] = {
            "allowed_formats":
                allowed_formats,

            "folder":
                folder,

            "timestamp":
                timestamp,

            "type":
                delivery_type,
        }

        serialized = "&".join(
            f"{key}={parameters[key]}"
            for key
            in sorted(
                parameters
            )
        )

        signature = sha1(
            (
                serialized
                + settings
                .cloudinary_api_secret
            ).encode(
                "utf-8"
            )
        ).hexdigest()

        # ========================================================
        # RESPONSE
        # ========================================================

        return MediaUploadSignatureResponse(
            cloud_name=(
                settings
                .cloudinary_cloud_name
            ),

            api_key=(
                settings
                .cloudinary_api_key
            ),

            timestamp=timestamp,

            signature=signature,

            folder=folder,

            resource_type=(
                resource_type
            ),

            delivery_type=(
                delivery_type
            ),

            allowed_formats=(
                allowed_formats
            ),

            # Cloudinary's standard REST Upload API endpoint stays
            # `/resource_type/upload`.
            #
            # The actual delivery type is supplied by the signed
            # `type` upload parameter.
            upload_url=(
                "https://api.cloudinary.com/"
                "v1_1/"
                f"{settings.cloudinary_cloud_name}/"
                f"{resource_type}/"
                "upload"
            ),
        )