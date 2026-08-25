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
]

MediaDeliveryType = Literal[
    "upload",
    "authenticated",
]


class MediaUploadSignatureRequest(BaseModel):
    resource_type: MediaResourceType
    scope: MediaScope


class MediaUploadSignatureResponse(BaseModel):
    cloud_name: str
    api_key: str
    timestamp: int
    signature: str
    folder: str

    resource_type: MediaResourceType
    delivery_type: MediaDeliveryType

    allowed_formats: str
    upload_url: str