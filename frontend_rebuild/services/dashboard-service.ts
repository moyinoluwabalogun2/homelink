import {
  api,
  getAccessToken,
} from "@/lib/api";

import type {
  UserDashboardSummary,
} from "@/types/dashboard";


const SUMMARY_CACHE_MS = 5_000;


interface SummaryCache {
  key: string;
  expiresAt: number;
  value: UserDashboardSummary;
}


interface SummaryRequest {
  key: string;
  promise: Promise<UserDashboardSummary>;
}


let cache:
  | SummaryCache
  | null = null;

let inFlight:
  | SummaryRequest
  | null = null;


function sessionKey(): string {
  return (
    getAccessToken() ??
    "cookie-session"
  );
}


export const dashboardService = {
  async getSummary(
    options: {
      force?: boolean;
    } = {},
  ): Promise<UserDashboardSummary> {
    const {
      force = false,
    } = options;

    const key =
      sessionKey();

    const now =
      Date.now();


    if (
      !force &&
      cache &&
      cache.key === key &&
      cache.expiresAt > now
    ) {
      return cache.value;
    }


    if (
      !force &&
      inFlight &&
      inFlight.key === key
    ) {
      return inFlight.promise;
    }


    const promise =
      api
        .get<UserDashboardSummary>(
          "/dashboard/summary",
        )
        .then(
          (
            response,
          ) => {
            const value =
              response.data;

            cache = {
              key,
              value,
              expiresAt:
                Date.now() +
                SUMMARY_CACHE_MS,
            };

            return value;
          },
        )
        .finally(() => {
          if (
            inFlight?.promise ===
            promise
          ) {
            inFlight = null;
          }
        });


    inFlight = {
      key,
      promise,
    };


    return promise;
  },


  invalidateSummary(): void {
    cache = null;
  },
};