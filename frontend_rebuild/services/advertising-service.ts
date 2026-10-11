import {
  api,
  API_BASE_URL,
} from "@/lib/api";

import type {
  Advertisement,
  AdvertisementCreatePayload,
  AdvertisementCreateResponse,
  AdvertisementManagedUpdatePayload,
  AdvertisementPayment,
  AdvertisementPaymentInitializeResponse,
  AdvertisementPaymentProvider,
  AdvertisementPlacement,
  PublicAdvertisement,
} from "@/types/advertising";


const CACHE_MS =
  60_000;


interface AdvertisementCache {
  expiresAt: number;
  value: PublicAdvertisement[];
}


const cache = new Map<
  string,
  AdvertisementCache
>();


const requests = new Map<
  string,
  Promise<PublicAdvertisement[]>
>();


function cacheKey(
  placement: AdvertisementPlacement,
  areaId?: string | null,
): string {
  return [
    placement,
    areaId ?? "all",
  ].join(":");
}


export const advertisingService = {
  async listLive(
    placement: AdvertisementPlacement,
    areaId?: string | null,
  ): Promise<PublicAdvertisement[]> {
    const key = cacheKey(
      placement,
      areaId,
    );

    const existing =
      cache.get(key);

    const now =
      Date.now();

    if (
      existing &&
      existing.expiresAt > now
    ) {
      return existing.value;
    }

    const running =
      requests.get(key);

    if (running) {
      return running;
    }

    const request = api
      .get<PublicAdvertisement[]>(
        `/advertisements/live/${placement}`,
        {
          params:
            areaId
              ? {
                  area_id:
                    areaId,
                }
              : undefined,
        },
      )
      .then((response) => {
        const value =
          response.data.slice(
            0,
            3,
          );

        cache.set(
          key,
          {
            value,

            expiresAt:
              Date.now() +
              CACHE_MS,
          },
        );

        return value;
      })
      .finally(() => {
        if (
          requests.get(key) ===
          request
        ) {
          requests.delete(
            key,
          );
        }
      });

    requests.set(
      key,
      request,
    );

    return request;
  },


  async recordImpression(
    advertisementId: string,
  ): Promise<boolean> {
    try {
      const response =
        await api.post<{
          recorded: boolean;
        }>(
          `/advertisements/${advertisementId}/impression`,
          {},
        );

      return (
        response.data.recorded
      );

    } catch {
      /*
       * Advertisement tracking must never interrupt
       * public browsing.
       */
      return false;
    }
  },


  clickUrl(
    advertisementId: string,
  ): string {
    return (
      `${API_BASE_URL}` +
      "/advertisements/" +
      `${advertisementId}/click`
    );
  },


  async create(
    payload: AdvertisementCreatePayload,
  ): Promise<AdvertisementCreateResponse> {
    const response =
      await api.post<AdvertisementCreateResponse>(
        "/advertisements",
        payload,
      );

    return response.data;
  },


  async getManaged(
    managementToken: string,
  ): Promise<Advertisement> {
    const response =
      await api.post<Advertisement>(
        "/advertisements/manage",
        {
          management_token:
            managementToken,
        },
      );

    return response.data;
  },


  async updateManaged(
    payload:
      AdvertisementManagedUpdatePayload,
  ): Promise<Advertisement> {
    const response =
      await api.patch<Advertisement>(
        "/advertisements/manage",
        payload,
      );

    return response.data;
  },


  async cancelManaged(
    managementToken: string,
  ): Promise<Advertisement> {
    const response =
      await api.post<Advertisement>(
        "/advertisements/manage/cancel",
        {
          management_token:
            managementToken,
        },
      );

    return response.data;
  },


  async initializePayment(
    managementToken: string,
    provider:
      Exclude<
        AdvertisementPaymentProvider,
        "mock"
      >,
  ): Promise<
    AdvertisementPaymentInitializeResponse
  > {
    const response =
      await api.post<
        AdvertisementPaymentInitializeResponse
      >(
        "/advertisement-payments/initialize",
        {
          management_token:
            managementToken,

          provider,
        },
      );

    return response.data;
  },


  async verifyPayment(
    managementToken: string,
    reference: string,
  ): Promise<AdvertisementPayment> {
    const response =
      await api.post<AdvertisementPayment>(
        "/advertisement-payments/verify",
        {
          management_token:
            managementToken,

          reference,
        },
      );

    return response.data;
  },


  async getPaymentStatus(
    managementToken: string,
    reference: string,
  ): Promise<AdvertisementPayment> {
    const response =
      await api.post<AdvertisementPayment>(
        "/advertisement-payments/status",
        {
          management_token:
            managementToken,

          reference,
        },
      );

    return response.data;
  },


  clearCache(): void {
    cache.clear();
    requests.clear();
  },
};