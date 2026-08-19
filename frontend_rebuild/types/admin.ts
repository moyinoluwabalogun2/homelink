import type { AccountStatus, UserRole } from "@/types/auth";
import type { AgentApplicationStatus, AgentProfile } from "@/types/agent";
import type { Listing } from "@/types/listing";

export interface AdminDashboardSummary {
  users: number;
  pending_agent_applications: number;
  pending_listings: number;
  open_reports: number;
  successful_payments: number;
  successful_payment_value_kobo: number;
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