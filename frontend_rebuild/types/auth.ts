export type UserRole = "user" | "agent" | "admin";

export type AccountStatus =
  | "pending_verification"
  | "active"
  | "suspended"
  | "deactivated";

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  profile_image_url: string | null;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  last_login_at: string | null;
  marketing_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  accept_terms: boolean;
  acknowledge_privacy: boolean;
  marketing_consent: boolean;
}

export interface MessageResponse {
  message: string;
}