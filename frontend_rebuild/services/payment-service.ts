import {
  api,
  getAccessToken,
} from "@/lib/api";

import type {
  CreditBalance,
  Payment,
  PaymentInitializeResponse,
  PaymentPlan,
} from "@/types/payment";


export const CREDITS_CHANGED_EVENT =
  "homelink:credits-changed";


const CREDIT_CACHE_MS =
  5_000;


interface CreditCache {
  key: string;
  expiresAt: number;
  value: CreditBalance[];
}


interface CreditRequest {
  key: string;
  promise: Promise<CreditBalance[]>;
}


let creditCache:
  | CreditCache
  | null = null;

let creditRequest:
  | CreditRequest
  | null = null;


function sessionKey(): string {
  return (
    getAccessToken() ??
    "cookie-session"
  );
}


function notifyCreditsChanged(): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new Event(
      CREDITS_CHANGED_EVENT,
    ),
  );
}


export const paymentService = {
  async listPlans():
    Promise<PaymentPlan[]> {
    const response =
      await api.get<
        PaymentPlan[]
      >(
        "/payments/plans",
      );

    return response.data;
  },


  async listCredits(
    options: {
      force?: boolean;
    } = {},
  ): Promise<CreditBalance[]> {
    const {
      force = false,
    } = options;

    const key =
      sessionKey();

    const now =
      Date.now();


    if (
      !force &&
      creditCache &&
      creditCache.key === key &&
      creditCache.expiresAt >
        now
    ) {
      return creditCache.value;
    }


    if (
      !force &&
      creditRequest &&
      creditRequest.key === key
    ) {
      return creditRequest.promise;
    }


    const promise =
      api
        .get<CreditBalance[]>(
          "/payments/credits/me",
        )
        .then(
          (
            response,
          ) => {
            const value =
              response.data;

            creditCache = {
              key,
              value,
              expiresAt:
                Date.now() +
                CREDIT_CACHE_MS,
            };

            return value;
          },
        )
        .finally(() => {
          if (
            creditRequest?.promise ===
            promise
          ) {
            creditRequest = null;
          }
        });


    creditRequest = {
      key,
      promise,
    };


    return promise;
  },


  async initialize(
    planCode: string,
  ): Promise<PaymentInitializeResponse> {
    const response =
      await api.post<
        PaymentInitializeResponse
      >(
        "/payments/initialize",
        {
          plan_code:
            planCode,
        },
      );

    return response.data;
  },


  async completeMock(
    reference: string,
  ): Promise<Payment> {
    const response =
      await api.post<Payment>(
        `/payments/mock/${reference}/complete`,
      );

    const payment =
      response.data;

    if (
      payment.status ===
      "success"
    ) {
      this.invalidateCredits();
      notifyCreditsChanged();
    }

    return payment;
  },


  async verify(
    reference: string,
  ): Promise<Payment> {
    const response =
      await api.post<Payment>(
        `/payments/${reference}/verify`,
      );

    const payment =
      response.data;

    if (
      payment.status ===
      "success"
    ) {
      this.invalidateCredits();
      notifyCreditsChanged();
    }

    return payment;
  },


  invalidateCredits(): void {
    creditCache = null;
  },
};