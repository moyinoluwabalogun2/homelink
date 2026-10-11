import { api } from "@/lib/api";

import type {
  AreaRead,
  CampusRead,
} from "@/types/location";


const LOCATION_CACHE_MS =
  5 * 60_000;


interface CachedValue<T> {
  expiresAt: number;
  value: T;
}


let areaCache:
  | CachedValue<AreaRead[]>
  | null = null;

let campusCache:
  | CachedValue<CampusRead[]>
  | null = null;

let areaRequest:
  | Promise<AreaRead[]>
  | null = null;

let campusRequest:
  | Promise<CampusRead[]>
  | null = null;


export const locationService = {
  async listAreas(): Promise<AreaRead[]> {
    const now = Date.now();

    if (
      areaCache &&
      areaCache.expiresAt > now
    ) {
      return areaCache.value;
    }

    if (areaRequest) {
      return areaRequest;
    }

    const request = api
      .get<AreaRead[]>(
        "/locations/areas",
      )
      .then((response) => {
        const value = response.data;

        areaCache = {
          value,
          expiresAt:
            Date.now() +
            LOCATION_CACHE_MS,
        };

        return value;
      })
      .finally(() => {
        if (
          areaRequest === request
        ) {
          areaRequest = null;
        }
      });

    areaRequest = request;

    return request;
  },


  async listCampuses(): Promise<CampusRead[]> {
    const now = Date.now();

    if (
      campusCache &&
      campusCache.expiresAt > now
    ) {
      return campusCache.value;
    }

    if (campusRequest) {
      return campusRequest;
    }

    const request = api
      .get<CampusRead[]>(
        "/locations/campuses",
      )
      .then((response) => {
        const value = response.data;

        campusCache = {
          value,
          expiresAt:
            Date.now() +
            LOCATION_CACHE_MS,
        };

        return value;
      })
      .finally(() => {
        if (
          campusRequest === request
        ) {
          campusRequest = null;
        }
      });

    campusRequest = request;

    return request;
  },
};