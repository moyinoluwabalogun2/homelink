import {
  api,
} from "@/lib/api";

import type {
  BuyPropertyCreatePayload,
  Listing,
  ListingFilters,
  MarketplaceCreatePayload,
  RentalCreatePayload,
} from "@/types/listing";


export const listingService = {
  async list(
    filters:
      ListingFilters = {},
    signal?:
      AbortSignal,
  ): Promise<Listing[]> {
    const response =
      await api.get<
        Listing[]
      >(
        "/listings",
        {
          params:
            filters,

          signal,
        },
      );

    return response.data;
  },


  async getById(
    listingId: string,
    signal?: AbortSignal,
  ): Promise<Listing> {
    const response =
      await api.get<Listing>(
        `/listings/${listingId}`,
        {
          signal,
        },
      );

    return response.data;
  },


  async getMineById(
    listingId: string,
  ): Promise<Listing> {
    const response =
      await api.get<Listing>(
        `/listings/mine/${listingId}`,
      );

    return response.data;
  },


  async listMine():
    Promise<Listing[]> {
    const response =
      await api.get<
        Listing[]
      >(
        "/listings/mine",
      );

    return response.data;
  },


  async listRecentlyDeleted():
    Promise<Listing[]> {
    const response =
      await api.get<
        Listing[]
      >(
        "/listings/mine/recently-deleted",
      );

    return response.data;
  },


  async createMarketplace(
    payload:
      MarketplaceCreatePayload,
  ): Promise<Listing> {
    const response =
      await api.post<Listing>(
        "/listings/marketplace",
        payload,
      );

    return response.data;
  },


  async createRental(
    payload:
      RentalCreatePayload,
  ): Promise<Listing> {
    const response =
      await api.post<Listing>(
        "/listings/rentals",
        payload,
      );

    return response.data;
  },


  async createBuyProperty(
    payload:
      BuyPropertyCreatePayload,
  ): Promise<Listing> {
    const response =
      await api.post<Listing>(
        "/listings/buy-properties",
        payload,
      );

    return response.data;
  },


  async updateRental(
    listingId: string,
    payload:
      RentalCreatePayload,
  ): Promise<Listing> {
    const response =
      await api.put<Listing>(
        `/listings/${listingId}/rental`,
        payload,
      );

    return response.data;
  },


  async updateBuyProperty(
    listingId: string,
    payload:
      BuyPropertyCreatePayload,
  ): Promise<Listing> {
    const response =
      await api.put<Listing>(
        `/listings/${listingId}/buy-property`,
        payload,
      );

    return response.data;
  },


  async updateMarketplace(
    listingId: string,
    payload:
      MarketplaceCreatePayload,
  ): Promise<Listing> {
    const response =
      await api.put<Listing>(
        `/listings/${listingId}/marketplace`,
        payload,
      );

    return response.data;
  },


  async submit(
    listingId: string,
  ): Promise<Listing> {
    const response =
      await api.post<Listing>(
        `/listings/${listingId}/submit`,
      );

    return response.data;
  },


  async complete(
    listingId: string,
  ): Promise<Listing> {
    const response =
      await api.post<Listing>(
        `/listings/${listingId}/complete`,
      );

    return response.data;
  },


  async reopen(
    listingId: string,
  ): Promise<Listing> {
    const response =
      await api.post<Listing>(
        `/listings/${listingId}/reopen`,
      );

    return response.data;
  },


  async restore(
    listingId: string,
  ): Promise<Listing> {
    const response =
      await api.post<Listing>(
        `/listings/${listingId}/restore`,
      );

    return response.data;
  },


  async remove(
    listingId: string,
  ): Promise<void> {
    await api.delete(
      `/listings/${listingId}`,
    );
  },
};