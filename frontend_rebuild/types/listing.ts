import type { UserRole } from "@/types/auth";
import type { AreaRead, CampusRead } from "@/types/location";

export type ListingType = "rental" | "buy_property" | "marketplace";

export type ListingStatus =
  | "draft"
  | "pending"
  | "published"
  | "rejected"
  | "expired"
  | "sold"
  | "rented"
  | "archived";

export type MediaType = "image" | "video";

export type RentalCategory =
  | "hostel"
  | "single_room"
  | "self_contain"
  | "shared_apartment"
  | "mini_flat"
  | "flat"
  | "duplex";

export type RentPeriod = "monthly" | "six_months" | "yearly";

export type PropertyCategory =
  | "land"
  | "house"
  | "duplex"
  | "commercial"
  | "office"
  | "warehouse";

export type PropertyCondition = "new" | "good" | "renovation_required";

export type MarketplaceCategory =
  | "phones"
  | "laptops"
  | "furniture"
  | "electronics"
  | "appliances"
  | "fashion"
  | "books"
  | "gadgets"
  | "services"
  | "others";

export type ItemCondition = "new" | "like_new" | "used" | "fair";

export interface PublicUser {
  id: string;
  full_name: string;
  role: UserRole;
  profile_image_url: string | null;
}

export interface ListingMedia {
  id: string;
  media_type: MediaType;
  url: string;
  sort_order: number;
  is_cover: boolean;
}

export interface RentalDetails {
  category: RentalCategory;
  rent_period: RentPeriod;
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  is_furnished: boolean;
  caution_fee: number | string | null;
  service_charge: number | string | null;
  distance_to_campus_km: number | string | null;
  address: string;
}

export interface BuyPropertyDetails {
  category: PropertyCategory;
  property_condition: PropertyCondition;
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  land_size_sqm: number | string | null;
  title_document: string | null;
  address: string;
}

export interface MarketplaceDetails {
  category: MarketplaceCategory;
  condition: ItemCondition;
  is_negotiable: boolean;
}

export interface Listing {
  id: string;
  owner: PublicUser;
  area: AreaRead;
  campus: CampusRead | null;
  listing_type: ListingType;
  title: string;
  slug: string;
  description: string;
  price: number | string;
  currency: string;
  status: ListingStatus;
  rejection_reason: string | null;
  is_featured: boolean;
  featured_until: string | null;
  published_at: string | null;
  expires_at: string | null;
  view_count: number;
  contact_count: number;
  media: ListingMedia[];
  rental_details: RentalDetails | null;
  buy_property_details: BuyPropertyDetails | null;
  marketplace_details: MarketplaceDetails | null;
  created_at: string;
  updated_at: string;
}

export interface ListingFilters {
  listing_type?: ListingType;
  area_id?: string;
  min_price?: number;
  max_price?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface SavedListing {
  listing: Listing;
  created_at: string;
}

export type InquiryType = "general" | "inspection";

export interface InquiryCreatePayload {
  inquiry_type: InquiryType;
  message: string;
}

export interface ListingMediaInput {
  media_type: MediaType;
  url: string;
  storage_public_id?: string | null;
  sort_order?: number;
  is_cover?: boolean;
}

export interface ListingBaseCreatePayload {
  area_id: string;
  campus_id?: string | null;
  title: string;
  description: string;
  price: number;
  media: ListingMediaInput[];
}

export interface MarketplaceCreatePayload extends ListingBaseCreatePayload {
  category: MarketplaceCategory;
  condition: ItemCondition;
  is_negotiable: boolean;
}

export interface RentalCreatePayload extends ListingBaseCreatePayload {
  category: RentalCategory;
  rent_period: RentPeriod;
  bedrooms?: number | null;
  bathrooms?: number | null;
  toilets?: number | null;
  is_furnished: boolean;
  caution_fee?: number | null;
  service_charge?: number | null;
  distance_to_campus_km?: number | null;
  address: string;
}

export interface BuyPropertyCreatePayload extends ListingBaseCreatePayload {
  category: PropertyCategory;
  property_condition: PropertyCondition;
  bedrooms?: number | null;
  bathrooms?: number | null;
  toilets?: number | null;
  land_size_sqm?: number | null;
  title_document?: string | null;
  address: string;
}