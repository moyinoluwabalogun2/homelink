import { api } from "@/lib/api";
import type { AreaRead, CampusRead } from "@/types/location";

export const locationService = {
  async listAreas(): Promise<AreaRead[]> {
    const response = await api.get<AreaRead[]>("/locations/areas");
    return response.data;
  },

  async listCampuses(): Promise<CampusRead[]> {
    const response = await api.get<CampusRead[]>("/locations/campuses");
    return response.data;
  },
};