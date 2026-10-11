import type {
  AccountStatus,
  UserRole,
} from "@/types/auth";

import type {
  AgentApplicationStatus,
  AgentProfile,
} from "@/types/agent";

import type {
  Listing,
} from "@/types/listing";


export interface AdminDashboardSummary {
  users: number;
  pending_agent_applications: number;
  pending_listings: number;
  open_reports: number;
  successful_payments: number;
  successful_payment_value_kobo: number;
}


export interface AdminRevenueSummary {
  total_kobo: number;
  listing_credit_kobo: number;
  advertisement_kobo: number;

  paystack_kobo: number;
  flutterwave_kobo: number;
  mock_kobo: number;

  successful_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  abandoned_transactions: number;
  refunded_transactions: number;
}


export interface AdminUserSummary {
  total: number;
  active: number;
  pending_verification: number;
  suspended: number;
  deactivated: number;
  registered_last_30_days: number;
}


export interface AdminListingSummary {
  total: number;
  draft: number;
  pending: number;
  published: number;
  rejected: number;
  expired: number;
  sold: number;
  rented: number;
  archived: number;
}


export interface AdminAgentSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}


export interface AdminAdvertisementSummary {
  total: number;
  payment_pending: number;
  pending_review: number;
  changes_requested: number;
  approved: number;
  scheduled: number;
  live: number;
  completed: number;
  rejected: number;
  cancelled: number;
  refunded: number;

  impressions: number;
  clicks: number;
}


export interface AdminBusinessDashboard {
  generated_at: string;

  revenue: AdminRevenueSummary;
  users: AdminUserSummary;
  listings: AdminListingSummary;
  agents: AdminAgentSummary;
  advertisements: AdminAdvertisementSummary;
}


export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  is_email_verified: boolean;
  email_verified_at: string | null;
  deleted_at: string | null;
  anonymized_at: string | null;
  created_at: string;
  updated_at: string;
}


export interface AdminUserFilters {
  q?: string;
  role?: UserRole;
  status?: AccountStatus;
  limit?: number;
  offset?: number;
}


export type ReportReason =
  | "fraud"
  | "misleading"
  | "duplicate"
  | "unavailable"
  | "inappropriate"
  | "other";


export type ReportStatus =
  | "open"
  | "in_review"
  | "resolved"
  | "dismissed";


export interface ListingReport {
  id: string;

  listing: Listing;

  reporter: {
    id: string;
    full_name: string;
    role: UserRole;
    profile_image_url: string | null;
  };

  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolution_note: string | null;

  reviewed_by: {
    id: string;
    full_name: string;
    role: UserRole;
    profile_image_url: string | null;
  } | null;

  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}


export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  request_id: string;
  ip_address: string | null;
  user_agent: string | null;
  status_code: number | null;
  details: Record<string, unknown>;
  created_at: string;
}


export interface AuditLogFilters {
  actor_user_id?: string;
  action?: string;
  created_from?: string;
  created_to?: string;
  limit?: number;
  offset?: number;
}


export interface MaintenanceResult {
  expired_listings: number;
  deleted_sessions: number;
  deleted_password_reset_tokens: number;
  deleted_email_verification_tokens: number;
  deleted_notifications: number;
  deleted_webhook_events: number;
  deleted_audit_logs: number;

  purged_agent_verification_documents?: number;
  completed_advertisements?: number;
  activated_advertisements?: number;
  deleted_media_cleanup_jobs?: number;
}


export interface AgentApplicationFilters {
  status?: AgentApplicationStatus;
}


export type PendingListing = Listing;

export type AgentApplication = AgentProfile;


export interface SystemReadiness {
  status: "ready" | "not_ready";

  checks: {
    database: string;
    redis: string;
  };
}


export type AdvertisementPlacement =
  | "homepage"
  | "discovery"
  | "marketplace"
  | "listing_detail";


export type AdvertisementStatus =
  | "payment_pending"
  | "pending_review"
  | "changes_requested"
  | "approved"
  | "scheduled"
  | "live"
  | "completed"
  | "rejected"
  | "cancelled"
  | "refunded";


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


export interface AdminAdvertisementPayment {
  id: string;
  advertisement_id: string;
  reference: string;
  provider: AdvertisementPaymentProvider;
  status: AdvertisementPaymentStatus;
  amount_kobo: number;
  currency: string;
  authorization_url: string | null;
  provider_transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}


export interface AdminAdvertisement {
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

  payments: AdminAdvertisementPayment[];
}


export interface AdminAdvertisementFilters {
  status?: AdvertisementStatus;
  placement?: AdvertisementPlacement;
  limit?: number;
  offset?: number;
}


export interface AdminAdvertisementListResponse {
  items: AdminAdvertisement[];
  total: number;
  limit: number;
  offset: number;
}


export interface AdvertisementApprovalPayload {
  go_live_now: boolean;
  scheduled_start_date: string | null;
  review_notes: string | null;
}