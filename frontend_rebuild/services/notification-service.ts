import { api } from "@/lib/api";
import type { Notification } from "@/types/notification";

export const notificationService = {
  async list(unreadOnly = false): Promise<Notification[]> {
    const response = await api.get<Notification[]>("/notifications", {
      params: { unread_only: unreadOnly, limit: 100 },
    });
    return response.data;
  },

  async markRead(notificationId: string): Promise<Notification> {
    const response = await api.patch<Notification>(
      `/notifications/${notificationId}/read`,
    );
    return response.data;
  },

  async markAllRead(): Promise<{ message: string }> {
    const response = await api.patch<{ message: string }>(
      "/notifications/read-all",
    );
    return response.data;
  },
};