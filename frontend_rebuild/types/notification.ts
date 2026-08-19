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