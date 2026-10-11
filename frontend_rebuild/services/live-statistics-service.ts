import {
  api,
} from "@/lib/api";

import type {
  LiveStatistics,
} from "@/types/live-statistics";


const STATISTICS_CACHE_MS =
  60_000;


interface CachedStatistics {
  expiresAt: number;
  value: LiveStatistics;
}


let statisticsCache:
  | CachedStatistics
  | null = null;


let statisticsRequest:
  | Promise<LiveStatistics>
  | null = null;


function normaliseCount(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(value),
  );
}


function normaliseStatistics(
  value: LiveStatistics,
): LiveStatistics {
  return {
    total_visitors:
      normaliseCount(
        value.total_visitors,
      ),

    registered_users:
      normaliseCount(
        value.registered_users,
      ),

    online_now:
      normaliseCount(
        value.online_now,
      ),
  };
}


export const liveStatisticsService = {
  async getLiveStatistics(): Promise<
    LiveStatistics
  > {
    const now = Date.now();

    if (
      statisticsCache &&
      statisticsCache.expiresAt > now
    ) {
      return statisticsCache.value;
    }

    if (statisticsRequest) {
      return statisticsRequest;
    }

    const request = api
      .get<LiveStatistics>(
        "/statistics/live",
        {
          timeout: 10_000,
        },
      )
      .then((response) => {
        const value =
          normaliseStatistics(
            response.data,
          );

        statisticsCache = {
          value,
          expiresAt:
            Date.now() +
            STATISTICS_CACHE_MS,
        };

        return value;
      })
      .finally(() => {
        if (
          statisticsRequest === request
        ) {
          statisticsRequest = null;
        }
      });

    statisticsRequest = request;

    return request;
  },

  clearCache(): void {
    statisticsCache = null;
    statisticsRequest = null;
  },
};