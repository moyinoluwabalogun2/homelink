from hashlib import sha1
import time
from uuid import UUID

from fastapi import HTTPException

from app.core.config import get_settings
from app.schemas.media import (
    MediaResourceType,
    MediaScope,
    MediaUploadSignatureResponse,
)


settings = get_settings()


ALLOWED_FORMATS: dict[MediaResourceType, str] = {
    "image": "jpg,jpeg,png,webp,avif",
    "video": "mp4,webm,mov",
}


class MediaService:
    def create_upload_signature(
        self,
        *,
        user_id: UUID,
        resource_type: MediaResourceType,
        scope: MediaScope,
    ) -> MediaUploadSignatureResponse:
        if not settings.cloudinary_enabled:
            raise HTTPException(
                status_code=503,
                detail="Media uploads are not configured yet.",
            )

        if (
            not settings.cloudinary_cloud_name
            or not settings.cloudinary_api_key
            or not settings.cloudinary_api_secret
        ):
            raise HTTPException(
                status_code=503,
                detail="Media storage configuration is incomplete.",
            )

        timestamp = int(time.time())

        base_folder = (
            settings.cloudinary_upload_folder.strip().strip("/")
            or "homelink"
        )

        folder = f"{base_folder}/{scope}/{user_id}"

        allowed_formats = ALLOWED_FORMATS[resource_type]

        parameters = {
            "allowed_formats": allowed_formats,
            "folder": folder,
            "timestamp": timestamp,
        }

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

        return MediaUploadSignatureResponse(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            timestamp=timestamp,
            signature=signature,
            folder=folder,
            resource_type=resource_type,
            allowed_formats=allowed_formats,
            upload_url=(
                "https://api.cloudinary.com/v1_1/"
                f"{settings.cloudinary_cloud_name}/"
                f"{resource_type}/upload"
            ),
        )