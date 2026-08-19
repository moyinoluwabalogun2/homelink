import type {
  Listing,
  PublicUser,
} from "@/types/listing";

import type {
  UserRole,
} from "@/types/auth";


export type InquiryType =
  | "general"
  | "inspection";

export type InquiryStatus =
  | "open"
  | "responded"
  | "closed";

export type ConversationListingType =
  | "rental"
  | "buy_property"
  | "marketplace";


/* =========================================================
   LEGACY INQUIRY
========================================================= */

export interface Inquiry {
  id: string;
  listing: Listing;
  sender: PublicUser;
  recipient: PublicUser;
  inquiry_type: InquiryType;
  message: string;
  status: InquiryStatus;
  responded_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}


/* =========================================================
   MESSAGES
========================================================= */

export interface InquiryParticipant {
  id: string;
  full_name: string;
  role: UserRole;
  profile_image_url: string | null;
}


export interface InquiryListingSummary {
  id: string;
  listing_type: ConversationListingType;
  title: string;
  slug: string;
}


export interface InquiryInboxItem {
  id: string;

  listing: InquiryListingSummary;
  other_user: InquiryParticipant;

  inquiry_type: InquiryType;
  status: InquiryStatus;

  last_message_preview: string;
  last_message_at: string;
  last_message_sender_id: string;

  unread: boolean;

  created_at: string;
}


export interface InquiryMessage {
  id: string;
  inquiry_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  updated_at: string;
}


export interface InquiryThread {
  id: string;

  listing: InquiryListingSummary;

  sender: InquiryParticipant;
  recipient: InquiryParticipant;

  inquiry_type: InquiryType;
  status: InquiryStatus;

  responded_at: string | null;
  closed_at: string | null;

  created_at: string;

  messages: InquiryMessage[];

  has_more: boolean;
  next_before: string | null;
}