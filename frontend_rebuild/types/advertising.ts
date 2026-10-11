export type AdvertisementPlacement =
  | "homepage"
  | "discovery"
  | "marketplace"
  | "listing_detail";


export type AdvertisementStatus =
  | "payment_pending"
  | "pending_review"
  | "changes_requested"
  | "scheduled"
  | "live"
  | "completed"
  | "rejected"
  | "cancelled";


export type AdvertisementPaymentProvider =
  | "mock"
  | "paystack"
  | "flutterwave";


export type AdvertisementPaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "abandoned"
  | "refunded";


export interface PublicAdvertisement {
  id: string;
  business_name: string;
  headline: string;
  description: string;
  call_to_action: string;
  image_url: string;

  placement: AdvertisementPlacement;
  area_id: string | null;

  starts_at: string;
  ends_at: string;
}


export interface Advertisement {
  id: string;
  reference: string;

  business_name: string;
  headline: string;
  description: string;
  call_to_action: string;
  destination_url: string;

  contact_email: string;
  contact_phone: string | null;

  image_url: string;
  image_public_id: string;

  placement: AdvertisementPlacement;
  status: AdvertisementStatus;

  area_id: string | null;

  amount_kobo: number;
  currency: string;
  duration_days: number;

  preferred_start_date: string | null;
  starts_at: string | null;
  ends_at: string | null;

  approved_at: string | null;
  rejected_at: string | null;
  completed_at: string | null;

  review_notes: string | null;
  rejection_reason: string | null;

  impression_count: number;
  click_count: number;

  created_at: string;
  updated_at: string;
}


export interface AdvertisementCreatePayload {
  business_name: string;
  headline: string;
  description: string;
  call_to_action: string;
  destination_url: string;

  contact_email: string;
  contact_phone?: string | null;

  placement: AdvertisementPlacement;
  area_id?: string | null;

  preferred_start_date?:
    | string
    | null;

  image_public_id: string;
  image_claim_token: string;
}


export interface AdvertisementCreateResponse {
  advertisement: Advertisement;
  management_token: string;
}


export interface AdvertisementManagedUpdatePayload {
  management_token: string;

  business_name?: string;
  headline?: string;
  description?: string;
  call_to_action?: string;
  destination_url?: string;

  contact_email?: string;
  contact_phone?:
    | string
    | null;

  placement?: AdvertisementPlacement;
  area_id?:
    | string
    | null;

  preferred_start_date?:
    | string
    | null;
}


export interface AdvertisementPayment {
  id: string;
  advertisement_id: string;
  reference: string;

  provider:
    AdvertisementPaymentProvider;

  status:
    AdvertisementPaymentStatus;

  amount_kobo: number;
  currency: string;

  authorization_url: string | null;

  provider_transaction_id:
    | string
    | null;

  paid_at: string | null;

  created_at: string;
  updated_at: string;
}


export interface AdvertisementPaymentInitializeResponse {
  payment: AdvertisementPayment;
  authorization_url: string;
}