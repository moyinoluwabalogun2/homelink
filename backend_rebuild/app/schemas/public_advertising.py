from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.models.enums import (
    AdvertisementPlacement,
)
from app.schemas.common import ORMModel


class PublicAdvertisementRead(
    ORMModel,
):
    """
    Public advert response.

    Private email, phone number, payment data, management token,
    moderation notes and Cloudinary public ID are deliberately
    excluded.
    """

    id: UUID
    business_name: str
    headline: str
    description: str
    call_to_action: str
    image_url: str

    placement: AdvertisementPlacement
    area_id: UUID | None

    starts_at: datetime
    ends_at: datetime