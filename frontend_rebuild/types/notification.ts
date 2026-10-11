export type NotificationType =
  | "system"
  | "security"
  | "agent_approved"
  | "agent_rejected"
  | "listing_approved"
  | "listing_rejected"
  | "new_inquiry"
  | "report_resolved"
  | "payment_success";

export interface Notification {
  id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPage {
  items: Notification[];
  has_more: boolean;
  next_before: string | null;
  next_before_id: string | null;
}

export interface NotificationMarkAllReadResponse {
  message: string;
  updated_count: number;
}