import type {
  CreditBalance,
} from "@/types/payment";


export interface UserDashboardSummary {
  saved_listings: number;
  sent_inquiries: number;
  received_inquiries: number;

  unread_notifications: number;
  unread_messages: number;

  listings_by_status: Record<
    string,
    number
  >;

  credits: CreditBalance[];
}