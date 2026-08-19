import { api } from "@/lib/api";
import type {
  BuyPropertyCreatePayload,
  Listing,
  ListingFilters,
  MarketplaceCreatePayload,
  RentalCreatePayload,
} from "@/types/listing";

export const listingService = {
  async list(filters: ListingFilters = {}): Promise<Listing[]> {
    const response = await api.get<Listing[]>("/listings", {
      params: filters,
    });
    return response.data;
  },

  async getById(listingId: string): Promise<Listing> {
    const response = await api.get<Listing>(`/listings/${listingId}`);
    return response.data;
  },

  async listMine(): Promise<Listing[]> {
    const response = await api.get<Listing[]>("/listings/mine");
    return response.data;
  },

  async createMarketplace(payload: MarketplaceCreatePayload): Promise<Listing> {
    const response = await api.post<Listing>("/listings/marketplace", payload);
    return response.data;
  },

  async createRental(payload: RentalCreatePayload): Promise<Listing> {
    const response = await api.post<Listing>("/listings/rentals", payload);
    return response.data;
  },

  async createBuyProperty(payload: BuyPropertyCreatePayload): Promise<Listing> {
    const response = await api.post<Listing>("/listings/buy-properties", payload);
    return response.data;
  },

  async submit(listingId: string): Promise<Listing> {
    const response = await api.post<Listing>(`/listings/${listingId}/submit`);
    return response.data;
  },

  async remove(listingId: string): Promise<void> {
    await api.delete(`/listings/${listingId}`);
  },
};