from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.models.enums import (
    ItemCondition,
    ListingStatus,
    ListingType,
    MarketplaceCategory,
    MediaType,
    PropertyCategory,
    PropertyCondition,
    RentalCategory,
    RentPeriod,
)
from app.schemas.common import ORMModel
from app.schemas.location import AreaRead, CampusRead
from app.schemas.user import PublicUserRead


class ListingMediaInput(BaseModel):
    media_type: MediaType
    url: HttpUrl
    storage_public_id: str | None = Field(default=None, max_length=255)
    sort_order: int = Field(default=0, ge=0)
    is_cover: bool = False


class ListingMediaRead(ORMModel):
    id: UUID
    media_type: MediaType
    url: str
    sort_order: int
    is_cover: bool


class ListingBaseCreate(BaseModel):
    area_id: UUID
    campus_id: UUID | None = None
    title: str = Field(min_length=5, max_length=220)
    description: str = Field(min_length=30, max_length=12000)
    price: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    media: list[ListingMediaInput] = Field(default_factory=list)


class RentalCreate(ListingBaseCreate):
    category: RentalCategory
    rent_period: RentPeriod
    bedrooms: int | None = Field(default=None, ge=0, le=100)
    bathrooms: int | None = Field(default=None, ge=0, le=100)
    toilets: int | None = Field(default=None, ge=0, le=100)
    is_furnished: bool = False
    caution_fee: Decimal | None = Field(default=None, ge=0)
    service_charge: Decimal | None = Field(default=None, ge=0)
    distance_to_campus_km: Decimal | None = Field(default=None, ge=0)
    address: str = Field(min_length=5, max_length=2000)


class BuyPropertyCreate(ListingBaseCreate):
    category: PropertyCategory
    property_condition: PropertyCondition
    bedrooms: int | None = Field(default=None, ge=0, le=100)
    bathrooms: int | None = Field(default=None, ge=0, le=100)
    toilets: int | None = Field(default=None, ge=0, le=100)
    land_size_sqm: Decimal | None = Field(default=None, ge=0)
    title_document: str | None = Field(default=None, max_length=180)
    address: str = Field(min_length=5, max_length=2000)


class MarketplaceCreate(ListingBaseCreate):
    category: MarketplaceCategory
    condition: ItemCondition
    is_negotiable: bool = False


class ListingRejectRequest(BaseModel):
    reason: str = Field(min_length=10, max_length=2000)


class RentalDetailsRead(ORMModel):
    category: RentalCategory
    rent_period: RentPeriod
    bedrooms: int | None
    bathrooms: int | None
    toilets: int | None
    is_furnished: bool
    caution_fee: Decimal | None
    service_charge: Decimal | None
    distance_to_campus_km: Decimal | None
    address: str


class BuyPropertyDetailsRead(ORMModel):
    category: PropertyCategory
    property_condition: PropertyCondition
    bedrooms: int | None
    bathrooms: int | None
    toilets: int | None
    land_size_sqm: Decimal | None
    title_document: str | None
    address: str


class MarketplaceDetailsRead(ORMModel):
    category: MarketplaceCategory
    condition: ItemCondition
    is_negotiable: bool


class ListingRead(ORMModel):
    id: UUID
    owner: PublicUserRead
    area: AreaRead
    campus: CampusRead | None
    listing_type: ListingType
    title: str
    slug: str
    description: str
    price: Decimal
    currency: str
    status: ListingStatus
    rejection_reason: str | None
    is_featured: bool
    featured_until: datetime | None
    published_at: datetime | None
    expires_at: datetime | None
    view_count: int
    contact_count: int
    media: list[ListingMediaRead]
    rental_details: RentalDetailsRead | None
    buy_property_details: BuyPropertyDetailsRead | None
    marketplace_details: MarketplaceDetailsRead | None
    created_at: datetime
    updated_at: datetime