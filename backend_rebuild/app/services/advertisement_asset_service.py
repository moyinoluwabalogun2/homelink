from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import quote

import httpx
from fastapi import HTTPException

from app.core.config import get_settings


settings = get_settings()


MAX_ADVERTISEMENT_IMAGE_BYTES = (
    5 * 1024 * 1024
)

MIN_ADVERTISEMENT_IMAGE_WIDTH = 600
MIN_ADVERTISEMENT_IMAGE_HEIGHT = 300

MAX_ADVERTISEMENT_IMAGE_WIDTH = 10000
MAX_ADVERTISEMENT_IMAGE_HEIGHT = 10000

ALLOWED_ADVERTISEMENT_FORMATS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
}


@dataclass(
    frozen=True,
)
class VerifiedAdvertisementImage:
    public_id: str
    secure_url: str
    file_format: str
    resource_type: str
    delivery_type: str
    bytes: int
    width: int
    height: int


class AdvertisementAssetService:
    async def verify_image(
        self,
        *,
        public_id: str,
    ) -> VerifiedAdvertisementImage:
        """
        Verify an advertisement image using Cloudinary's
        server-side Admin API.

        Values returned by the browser are never trusted.

        Requirements:

        - The Cloudinary asset must exist.
        - It must be a normal uploaded image.
        - It must belong to HomeLink's advertisements folder.
        - It must be JPG, JPEG, PNG or WebP.
        - It must be no larger than 5 MB.
        - It must have usable advert dimensions.
        """

        self._ensure_configured()

        clean_public_id = (
            public_id.strip()
        )

        if not clean_public_id:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Advertisement image "
                    "public ID is required."
                ),
            )

        base_folder = (
            settings.cloudinary_upload_folder
            .strip()
            .strip("/")
            or "homelink"
        )

        expected_folder_prefix = (
            f"{base_folder}/"
            "advertisements/"
        )

        if not clean_public_id.startswith(
            expected_folder_prefix
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "This image does not belong "
                    "to HomeLink's advertisement "
                    "upload area."
                ),
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
            "upload/"
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
                    "reached to verify the "
                    "advertisement image."
                ),
            ) from exc

        if response.status_code == 404:
            raise HTTPException(
                status_code=422,
                detail=(
                    "The uploaded advertisement "
                    "image could not be found."
                ),
            )

        if response.status_code == 420:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cloudinary image verification "
                    "is temporarily rate limited."
                ),
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=503,
                detail=(
                    "The advertisement image "
                    "could not be validated."
                ),
            )

        try:
            asset = response.json()

        except ValueError as exc:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cloudinary returned an invalid "
                    "image verification response."
                ),
            ) from exc

        if not isinstance(
            asset,
            dict,
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cloudinary returned an invalid "
                    "image verification response."
                ),
            )

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

        raw_width = asset.get(
            "width",
        )

        raw_height = asset.get(
            "height",
        )

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
                    "Advertisement image "
                    "identity mismatch."
                ),
            )

        if (
            resource_type != "image"
            or delivery_type != "upload"
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Advertisements must use "
                    "standard uploaded images."
                ),
            )

        belongs_to_advertisement_folder = (
            returned_public_id.startswith(
                expected_folder_prefix
            )
        )

        if isinstance(
            asset_folder,
            str,
        ):
            belongs_to_advertisement_folder = (
                belongs_to_advertisement_folder
                and asset_folder.startswith(
                    expected_folder_prefix
                    .rstrip("/")
                )
            )

        if not belongs_to_advertisement_folder:
            raise HTTPException(
                status_code=403,
                detail=(
                    "This image does not belong "
                    "to HomeLink's advertisement "
                    "upload area."
                ),
            )

        if not isinstance(
            raw_format,
            str,
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Advertisement image format "
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
            not in ALLOWED_ADVERTISEMENT_FORMATS
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Advertisement images must be "
                    "JPG, PNG or WebP files."
                ),
            )

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
                    "Advertisement image size "
                    "could not be validated."
                ),
            )

        if (
            raw_bytes
            > MAX_ADVERTISEMENT_IMAGE_BYTES
        ):
            raise HTTPException(
                status_code=413,
                detail=(
                    "Advertisement images must "
                    "be 5 MB or smaller."
                ),
            )

        if (
            not isinstance(
                raw_width,
                int,
            )
            or isinstance(
                raw_width,
                bool,
            )
            or raw_width <= 0
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Advertisement image width "
                    "could not be validated."
                ),
            )

        if (
            not isinstance(
                raw_height,
                int,
            )
            or isinstance(
                raw_height,
                bool,
            )
            or raw_height <= 0
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Advertisement image height "
                    "could not be validated."
                ),
            )

        if (
            raw_width
            < MIN_ADVERTISEMENT_IMAGE_WIDTH
            or raw_height
            < MIN_ADVERTISEMENT_IMAGE_HEIGHT
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Advertisement images must be "
                    "at least 600 by 300 pixels."
                ),
            )

        if (
            raw_width
            > MAX_ADVERTISEMENT_IMAGE_WIDTH
            or raw_height
            > MAX_ADVERTISEMENT_IMAGE_HEIGHT
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Advertisement image dimensions "
                    "are too large."
                ),
            )

        if (
            not isinstance(
                secure_url,
                str,
            )
            or not secure_url.startswith(
                "https://"
            )
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Advertisement image has no "
                    "valid secure delivery URL."
                ),
            )

        return VerifiedAdvertisementImage(
            public_id=returned_public_id,
            secure_url=secure_url,
            file_format=file_format,
            resource_type=resource_type,
            delivery_type=delivery_type,
            bytes=raw_bytes,
            width=raw_width,
            height=raw_height,
        )

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
                    "Cloudinary advertisement "
                    "verification is not configured."
                ),
            )