from hashlib import sha1
import time
from uuid import UUID

from fastapi import HTTPException

from app.core.config import get_settings
from app.schemas.media import (
    MediaDeliveryType,
    MediaResourceType,
    MediaUploadSignatureResponse,
)


settings = get_settings()


class MediaService:
    def create_upload_signature(
        self,
        *,
        user_id: UUID,
        resource_type: MediaResourceType,
        scope: str,
    ) -> MediaUploadSignatureResponse:
        if not settings.cloudinary_enabled:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cloudinary uploads are "
                    "not configured yet."
                ),
            )

        if (
            scope == "agent-documents"
            and resource_type != "image"
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Agent verification "
                    "documents must be images."
                ),
            )

        delivery_type: MediaDeliveryType = (
            "authenticated"
            if scope == "agent-documents"
            else "upload"
        )

        timestamp = int(
            time.time()
        )

        folder = (
            f"{settings.cloudinary_upload_folder}"
            f"/{scope}/{user_id}"
        )

        # These are the parameters the browser will send
        # to Cloudinary, so they must be part of the signature.
        parameters: dict[str, str | int] = {
            "folder": folder,
            "timestamp": timestamp,
        }

        if delivery_type == "authenticated":
            parameters["type"] = "authenticated"

        serialized = "&".join(
            f"{key}={parameters[key]}"
            for key in sorted(parameters)
        )

        signature = sha1(
            (
                f"{serialized}"
                f"{settings.cloudinary_api_secret}"
            ).encode("utf-8")
        ).hexdigest()

        # Upload API endpoint remains /<resource_type>/upload.
        upload_url = (
            "https://api.cloudinary.com/"
            "v1_1/"
            f"{settings.cloudinary_cloud_name}/"
            f"{resource_type}/upload"
        )

        return MediaUploadSignatureResponse(
            cloud_name=(
                settings.cloudinary_cloud_name
                or ""
            ),
            api_key=(
                settings.cloudinary_api_key
                or ""
            ),
            timestamp=timestamp,
            signature=signature,
            folder=folder,
            resource_type=resource_type,
            delivery_type=delivery_type,
            upload_url=upload_url,
        )