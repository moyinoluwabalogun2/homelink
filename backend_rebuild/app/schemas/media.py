from typing import Literal

from pydantic import BaseModel


MediaResourceType = Literal[
    "image",
    "video",
]

MediaScope = Literal[
    "listings",
    "agent-documents",
    "profiles",
    "advertisements",
]

MediaDeliveryType = Literal[
    "upload",
    "authenticated",
]


class MediaUploadSignatureRequest(
    BaseModel,
):
    resource_type: MediaResourceType
    scope: MediaScope


class MediaUploadSignatureResponse(
    BaseModel,
):
    cloud_name: str
    api_key: str
    timestamp: int
    signature: str
    folder: str

    # Value submitted to Cloudinary together with the folder.
    upload_public_id: str

    # Complete public ID expected back from Cloudinary.
    expected_public_id: str

    resource_type: MediaResourceType
    delivery_type: MediaDeliveryType

    allowed_formats: str
    upload_url: str

    # Advert uploads are anonymous. This signed token proves
    # that HomeLink issued the public ID to the advertiser.
    #
    # Authenticated listing/profile/document uploads do not
    # require it and therefore return None.
    claim_token: str | None = None
    claim_token_expires_at: int | None = None