import { cache } from "react";

import type {
  Listing,
  ListingFilters,
} from "@/types/listing";

function apiBaseUrl(): string {
  const serverOrigin =
    process.env
      .BACKEND_API_ORIGIN
      ?.trim();

  if (serverOrigin) {
    return `${
      serverOrigin.replace(
        /\/+$/,
        "",
      )
    }/api/v1`;
  }

  const publicBase =
    process.env
      .NEXT_PUBLIC_API_BASE_URL
      ?.trim();

  if (publicBase) {
    return publicBase.replace(
      /\/+$/,
      "",
    );
  }

  return process.env.NODE_ENV ===
    "production"
    ? "https://homelink-vo5e.onrender.com/api/v1"
    : "http://localhost:8001/api/v1";
}

function listingQuery(
  filters: ListingFilters,
): string {
  const params =
    new URLSearchParams();

  if (filters.listing_type) {
    params.set(
      "listing_type",
      filters.listing_type,
    );
  }

  if (filters.area_id) {
    params.set(
      "area_id",
      filters.area_id,
    );
  }

  if (
    filters.min_price !==
    undefined
  ) {
    params.set(
      "min_price",
      String(
        filters.min_price,
      ),
    );
  }

  if (
    filters.max_price !==
    undefined
  ) {
    params.set(
      "max_price",
      String(
        filters.max_price,
      ),
    );
  }

  if (filters.q?.trim()) {
    params.set(
      "q",
      filters.q.trim(),
    );
  }

  if (
    filters.category?.trim()
  ) {
    params.set(
      "category",
      filters.category.trim(),
    );
  }

  if (filters.sort) {
    params.set(
      "sort",
      filters.sort,
    );
  }

  if (
    filters.limit !==
    undefined
  ) {
    params.set(
      "limit",
      String(
        filters.limit,
      ),
    );
  }

  if (
    filters.offset !==
    undefined
  ) {
    params.set(
      "offset",
      String(
        filters.offset,
      ),
    );
  }

  return params.toString();
}

export async function getPublicListings(
  filters: ListingFilters = {},
): Promise<Listing[]> {
  const query =
    listingQuery(filters);

  const url = query
    ? `${apiBaseUrl()}/listings?${query}`
    : `${apiBaseUrl()}/listings`;

  try {
    const response = await fetch(
      url,
      {
        headers: {
          Accept:
            "application/json",
        },
        next: {
          revalidate: 300,
        },
        signal:
          AbortSignal.timeout(
            8_000,
          ),
      },
    );

    if (!response.ok) {
      return [];
    }

    const payload =
      (await response.json()) as unknown;

    if (
      !Array.isArray(payload)
    ) {
      return [];
    }

    return payload as Listing[];
  } catch {
    /*
     * The homepage remains available during a Render
     * cold start or temporary backend outage.
     */
    return [];
  }
}

export const getPublicListing =
  cache(
    async (
      listingId: string,
    ): Promise<Listing | null> => {
      const safeListingId =
        encodeURIComponent(
          listingId,
        );

      try {
        const response =
          await fetch(
            `${apiBaseUrl()}/listings/${safeListingId}`,
            {
              headers: {
                Accept:
                  "application/json",
              },
              next: {
                revalidate: 300,
              },
              signal:
                AbortSignal.timeout(
                  8_000,
                ),
            },
          );

        if (!response.ok) {
          return null;
        }

        return (
          await response.json()
        ) as Listing;
      } catch {
        return null;
      }
    },
  );

export function listingDescription(
  listing: Listing,
): string {
  const normalized =
    listing.description
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  if (
    normalized.length <= 155
  ) {
    return normalized;
  }

  return `${
    normalized
      .slice(0, 152)
      .trimEnd()
  }…`;
}

export function listingCoverImage(
  listing: Listing,
): string | null {
  const images =
    listing.media.filter(
      (item) =>
        item.media_type ===
        "image",
    );

  return (
    images.find(
      (item) =>
        item.is_cover,
    )?.url ??
    images[0]?.url ??
    null
  );
}