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


const CREDIT_CACHE_MS = 5_000;
const PLAN_CACHE_MS = 5 * 60_000;
const HISTORY_CACHE_MS = 5_000;
const SUCCESS_CACHE_MS = 30_000;


function sessionKey(): string {
  return (
    getAccessToken() ??
    "cookie-session"
  );
}


/* =========================================================
   CREDIT CACHE
========================================================= */

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


/* =========================================================
   PLAN CACHE

   Plans barely change, so there is no reason for every
   React mount to hit the API again.
========================================================= */

let planCache:
  | {
      expiresAt: number;
      value: PaymentPlan[];
    }
  | null = null;

let planRequest:
  | Promise<PaymentPlan[]>
  | null = null;


/* =========================================================
   HISTORY CACHE
========================================================= */

interface HistoryCache {
  key: string;
  expiresAt: number;
  value: Payment[];
}

interface HistoryRequest {
  key: string;
  promise: Promise<Payment[]>;
}

let historyCache:
  | HistoryCache
  | null = null;

let historyRequest:
  | HistoryRequest
  | null = null;


/* =========================================================
   VERIFY DEDUPLICATION

   One reference can have only ONE client-side verification
   request in flight at a time.
========================================================= */

const verifyRequests =
  new Map<
    string,
    Promise<Payment>
  >();

const verifiedSuccessCache =
  new Map<
    string,
    {
      expiresAt: number;
      value: Payment;
    }
  >();


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


function invalidateCredits(): void {
  creditCache = null;
}


function invalidateHistory(): void {
  historyCache = null;
}


export const paymentService = {
  async listPlans():
    Promise<PaymentPlan[]> {
    const now =
      Date.now();

    if (
      planCache &&
      planCache.expiresAt > now
    ) {
      return planCache.value;
    }

    if (planRequest) {
      return planRequest;
    }

    const request =
      api
        .get<PaymentPlan[]>(
          "/payments/plans",
        )
        .then(
          (response) => {
            const value =
              response.data;

            planCache = {
              value,
              expiresAt:
                Date.now() +
                PLAN_CACHE_MS,
            };

            return value;
          },
        )
        .finally(() => {
          if (
            planRequest ===
            request
          ) {
            planRequest =
              null;
          }
        });

    planRequest =
      request;

    return request;
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
      creditCache.expiresAt > now
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
          (response) => {
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
            creditRequest =
              null;
          }
        });

    creditRequest = {
      key,
      promise,
    };

    return promise;
  },


  async listHistory(
    options: {
      limit?: number;
      offset?: number;
      force?: boolean;
    } = {},
  ): Promise<Payment[]> {
    const {
      limit = 20,
      offset = 0,
      force = false,
    } = options;

    const key =
      `${sessionKey()}:${limit}:${offset}`;

    const now =
      Date.now();

    if (
      !force &&
      historyCache &&
      historyCache.key === key &&
      historyCache.expiresAt > now
    ) {
      return historyCache.value;
    }

    if (
      !force &&
      historyRequest &&
      historyRequest.key === key
    ) {
      return historyRequest.promise;
    }

    const promise =
      api
        .get<Payment[]>(
          "/payments/history",
          {
            params: {
              limit,
              offset,
            },
          },
        )
        .then(
          (response) => {
            const value =
              response.data;

            historyCache = {
              key,
              value,
              expiresAt:
                Date.now() +
                HISTORY_CACHE_MS,
            };

            return value;
          },
        )
        .finally(() => {
          if (
            historyRequest?.promise ===
            promise
          ) {
            historyRequest =
              null;
          }
        });

    historyRequest = {
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
        {
          // Payment providers are external services.
          // Give initialization slightly more room than
          // an ordinary HomeLink API request.
          timeout: 30_000,
        },
      );

    invalidateHistory();

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

    invalidateHistory();

    if (
      payment.status ===
      "success"
    ) {
      invalidateCredits();
      notifyCreditsChanged();
    }

    return payment;
  },


  async verify(
    reference: string,
  ): Promise<Payment> {
    const cached =
      verifiedSuccessCache.get(
        reference,
      );

    if (
      cached &&
      cached.expiresAt >
        Date.now()
    ) {
      return cached.value;
    }

    const existing =
      verifyRequests.get(
        reference,
      );

    if (existing) {
      return existing;
    }

    const request =
      api
        .post<Payment>(
          `/payments/${reference}/verify`,
          undefined,
          {
            // Backend may need to contact Flutterwave.
            // This avoids the browser aborting just before
            // the provider responds.
            timeout: 30_000,
          },
        )
        .then(
          (response) => {
            const payment =
              response.data;

            invalidateHistory();

            if (
              payment.status ===
              "success"
            ) {
              verifiedSuccessCache.set(
                reference,
                {
                  value:
                    payment,
                  expiresAt:
                    Date.now() +
                    SUCCESS_CACHE_MS,
                },
              );

              invalidateCredits();

              notifyCreditsChanged();
            }

            return payment;
          },
        )
        .finally(() => {
          if (
            verifyRequests.get(
              reference,
            ) === request
          ) {
            verifyRequests.delete(
              reference,
            );
          }
        });

    verifyRequests.set(
      reference,
      request,
    );

    return request;
  },


  invalidateCredits(): void {
    invalidateCredits();
  },


  invalidateHistory(): void {
    invalidateHistory();
  },
};