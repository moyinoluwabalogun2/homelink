from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from uuid import UUID, uuid4

from cloudinary.utils import (
    api_sign_request,
)
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.core.config import get_settings
from app.schemas.media import (
    MediaDeliveryType,
    MediaResourceType,
    MediaScope,
    MediaUploadSignatureResponse,
)
from app.services.media_cleanup_service import (
    MediaCleanupService,
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

ADVERTISEMENT_ALLOWED_FORMATS = (
    "jpg,jpeg,png,webp"
)


class MediaService:
    ADVERTISEMENT_CLAIM_TOKEN_SECONDS = (
        30 * 60
    )

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session
        self.cleanup = MediaCleanupService(
            session,
        )

    async def create_upload_signature(
        self,
        *,
        user_id: UUID,
        resource_type: MediaResourceType,
        scope: MediaScope,
    ) -> MediaUploadSignatureResponse:
        """
        Create an upload signature for an authenticated user.

        Existing listing, agent-document and profile upload
        behaviour is preserved. Advertisements use the separate
        anonymous advertisement upload method.
        """

        self._require_configuration()

        if scope == "advertisements":
            raise HTTPException(
                status_code=422,
                detail=(
                    "Advertisement images must use "
                    "the advertisement upload endpoint."
                ),
            )

        if scope == "agent-documents":
            if resource_type != "image":
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Agent verification documents "
                        "must be image files."
                    ),
                )

            delivery_type: (
                MediaDeliveryType
            ) = "authenticated"

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

        base_folder = (
            settings.cloudinary_upload_folder
            .strip()
            .strip("/")
            or "homelink"
        )

        folder = (
            f"{base_folder}/"
            f"{scope}/"
            f"{user_id}"
        )

        upload_public_id = uuid4().hex

        expected_public_id = (
            f"{folder}/"
            f"{upload_public_id}"
        )

        timestamp = int(
            time.time(),
        )

        parameters_to_sign = {
            "allowed_formats":
                allowed_formats,
            "folder":
                folder,
            "public_id":
                upload_public_id,
            "timestamp":
                timestamp,
            "type":
                delivery_type,
        }

        signature = api_sign_request(
            parameters_to_sign,
            settings.cloudinary_api_secret,
        )

        upload_url = self._build_upload_url(
            resource_type=resource_type,
        )

        # Listing uploads enter the durable cleanup queue before
        # the signature reaches the browser.
        #
        # If the upload fails, Cloudinary eventually returns
        # not_found and the queue entry closes safely.
        #
        # If a listing references the asset, cleanup detects the
        # reference and cancels deletion.
        if scope == "listings":
            await self.cleanup.enqueue_assets(
                assets=[
                    (
                        expected_public_id,
                        resource_type,
                        delivery_type,
                        None,
                    ),
                ],
                reason="unclaimed_upload",
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
            upload_public_id=(
                upload_public_id
            ),
            expected_public_id=(
                expected_public_id
            ),
            resource_type=resource_type,
            delivery_type=delivery_type,
            allowed_formats=allowed_formats,
            upload_url=upload_url,
            claim_token=None,
            claim_token_expires_at=None,
        )

    async def create_advertisement_upload_signature(
        self,
    ) -> MediaUploadSignatureResponse:
        """
        Create a safe anonymous advert-image upload signature.

        An advertiser does not require an account. HomeLink
        creates an unpredictable upload folder and a short-lived
        signed token that proves ownership of the issued upload.
        """

        self._require_configuration()

        resource_type: (
            MediaResourceType
        ) = "image"

        delivery_type: (
            MediaDeliveryType
        ) = "upload"

        allowed_formats = (
            ADVERTISEMENT_ALLOWED_FORMATS
        )

        base_folder = (
            settings.cloudinary_upload_folder
            .strip()
            .strip("/")
            or "homelink"
        )

        upload_session_id = uuid4().hex

        folder = (
            f"{base_folder}/"
            "advertisements/"
            f"{upload_session_id}"
        )

        upload_public_id = uuid4().hex

        expected_public_id = (
            f"{folder}/"
            f"{upload_public_id}"
        )

        timestamp = int(
            time.time(),
        )

        parameters_to_sign = {
            "allowed_formats":
                allowed_formats,
            "folder":
                folder,
            "public_id":
                upload_public_id,
            "timestamp":
                timestamp,
            "type":
                delivery_type,
        }

        signature = api_sign_request(
            parameters_to_sign,
            settings.cloudinary_api_secret,
        )

        expires_at = (
            timestamp
            + self.ADVERTISEMENT_CLAIM_TOKEN_SECONDS
        )

        claim_token = (
            self._create_advertisement_claim_token(
                public_id=expected_public_id,
                expires_at=expires_at,
            )
        )

        # If no advert claims this image, the normal maintenance
        # process will remove it after the upload grace period.
        await self.cleanup.enqueue_assets(
            assets=[
                (
                    expected_public_id,
                    resource_type,
                    delivery_type,
                    None,
                ),
            ],
            reason="unclaimed_upload",
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
            upload_public_id=(
                upload_public_id
            ),
            expected_public_id=(
                expected_public_id
            ),
            resource_type=resource_type,
            delivery_type=delivery_type,
            allowed_formats=allowed_formats,
            upload_url=self._build_upload_url(
                resource_type=resource_type,
            ),
            claim_token=claim_token,
            claim_token_expires_at=expires_at,
        )

    def verify_advertisement_claim_token(
        self,
        *,
        public_id: str,
        claim_token: str,
    ) -> None:
        """
        Validate an advertisement image claim before creating or
        updating an Advertisement database row.
        """

        clean_public_id = (
            public_id.strip()
        )

        clean_claim_token = (
            claim_token.strip()
        )

        if (
            not clean_public_id
            or not clean_claim_token
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "The advertisement image "
                    "upload proof is missing."
                ),
            )

        try:
            (
                encoded_payload,
                supplied_signature,
            ) = clean_claim_token.split(
                ".",
                1,
            )

            payload_bytes = (
                self._decode_urlsafe_base64(
                    encoded_payload
                )
            )

            payload = json.loads(
                payload_bytes.decode(
                    "utf-8"
                )
            )

        except (
            UnicodeDecodeError,
            ValueError,
            TypeError,
            json.JSONDecodeError,
        ) as exc:
            raise HTTPException(
                status_code=422,
                detail=(
                    "The advertisement image "
                    "upload proof is invalid."
                ),
            ) from exc

        expected_signature = (
            self._sign_claim_payload(
                encoded_payload
            )
        )

        if not hmac.compare_digest(
            supplied_signature,
            expected_signature,
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "The advertisement image "
                    "upload proof is invalid."
                ),
            )

        token_public_id = payload.get(
            "public_id",
        )

        expires_at = payload.get(
            "expires_at",
        )

        if (
            not isinstance(
                token_public_id,
                str,
            )
            or token_public_id
            != clean_public_id
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "The advertisement image does "
                    "not match its upload proof."
                ),
            )

        if (
            not isinstance(
                expires_at,
                int,
            )
            or isinstance(
                expires_at,
                bool,
            )
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "The advertisement image "
                    "upload proof is invalid."
                ),
            )

        if expires_at < int(
            time.time(),
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "The advertisement image upload "
                    "has expired. Please upload it again."
                ),
            )

        base_folder = (
            settings.cloudinary_upload_folder
            .strip()
            .strip("/")
            or "homelink"
        )

        expected_prefix = (
            f"{base_folder}/"
            "advertisements/"
        )

        if not clean_public_id.startswith(
            expected_prefix
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "The advertisement image is "
                    "outside HomeLink's advert "
                    "upload area."
                ),
            )

    def _create_advertisement_claim_token(
        self,
        *,
        public_id: str,
        expires_at: int,
    ) -> str:
        payload = json.dumps(
            {
                "public_id": public_id,
                "expires_at": expires_at,
            },
            separators=(
                ",",
                ":",
            ),
            sort_keys=True,
        ).encode(
            "utf-8"
        )

        encoded_payload = (
            base64.urlsafe_b64encode(
                payload
            )
            .decode(
                "ascii"
            )
            .rstrip("=")
        )

        signature = (
            self._sign_claim_payload(
                encoded_payload
            )
        )

        return (
            f"{encoded_payload}."
            f"{signature}"
        )

    def _sign_claim_payload(
        self,
        encoded_payload: str,
    ) -> str:
        digest = hmac.new(
            settings.secret_key.encode(
                "utf-8"
            ),
            (
                "homelink-advertisement-upload:"
                f"{encoded_payload}"
            ).encode(
                "utf-8"
            ),
            hashlib.sha256,
        ).digest()

        return (
            base64.urlsafe_b64encode(
                digest
            )
            .decode(
                "ascii"
            )
            .rstrip("=")
        )

    @staticmethod
    def _decode_urlsafe_base64(
        value: str,
    ) -> bytes:
        padding = (
            "="
            * (
                (-len(value))
                % 4
            )
        )

        return base64.urlsafe_b64decode(
            value + padding
        )

    def _build_upload_url(
        self,
        *,
        resource_type: MediaResourceType,
    ) -> str:
        return (
            "https://api.cloudinary.com/"
            "v1_1/"
            f"{settings.cloudinary_cloud_name}/"
            f"{resource_type}/upload"
        )

    def _require_configuration(
        self,
    ) -> None:
        if not settings.cloudinary_enabled:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Media uploads are not "
                    "configured yet."
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
                    "Media storage configuration "
                    "is incomplete."
                ),
            )