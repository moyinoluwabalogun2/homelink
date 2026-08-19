export type CreditType = "marketplace" | "rental" | "buy_property";
export type PaymentProvider = "mock" | "paystack";
export type PaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "abandoned"
  | "refunded";

export interface CreditBalance {
  credit_type: CreditType;
  free_remaining: number;
  paid_remaining: number;
}

export interface PaymentPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  credit_type: CreditType;
  credit_quantity: number;
  amount_kobo: number;
  currency: string;
}

export interface Payment {
  id: string;
  reference: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount_kobo: number;
  currency: string;
  authorization_url: string | null;
  paid_at: string | null;
  plan: PaymentPlan;
  created_at: string;
}

export interface PaymentInitializeResponse {
  payment: Payment;
  authorization_url: string;
}