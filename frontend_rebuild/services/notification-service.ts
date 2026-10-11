import { api } from "@/lib/api";

import type {
  Notification,
  NotificationMarkAllReadResponse,
  NotificationPage,
} from "@/types/notification";


export const NOTIFICATIONS_CHANGED_EVENT =
  "homelink:notifications-changed";


export interface NotificationCountChange {
  absolute?: number;
  delta?: number;
}


interface ListOptions {
  unreadOnly?: boolean;
  limit?: number;
  before?: string | null;
  beforeId?: string | null;
}


/**
 * Requests with identical filters share one Promise.
 *
 * This prevents React development mode, route transitions, or
 * multiple components from sending duplicate notification requests
 * to the backend at the same time.
 */
const inFlight = new Map<
  string,
  Promise<NotificationPage>
>();


export function emitNotificationCountChange(
  detail: NotificationCountChange,
): void {
  window.dispatchEvent(
    new CustomEvent(
      NOTIFICATIONS_CHANGED_EVENT,
      {
        detail,
      },
    ),
  );
}


export const notificationService = {
  async list(
    options: ListOptions = {},
  ): Promise<NotificationPage> {
    const {
      unreadOnly = false,
      limit = 30,
      before = null,
      beforeId = null,
    } = options;

    const key = JSON.stringify({
      unreadOnly,
      limit,
      before,
      beforeId,
    });

    const existing = inFlight.get(key);

    if (existing) {
      return existing;
    }

    const request = api
      .get<NotificationPage>(
        "/notifications",
        {
          params: {
            unread_only: unreadOnly,
            limit,
            before: before ?? undefined,
            before_id: beforeId ?? undefined,
          },
        },
      )
      .then(
        (response) => response.data,
      )
      .finally(() => {
        if (inFlight.get(key) === request) {
          inFlight.delete(key);
        }
      });

    inFlight.set(key, request);

    return request;
  },

  async markRead(
    notificationId: string,
  ): Promise<Notification> {
    const response = await api.patch<Notification>(
      `/notifications/${notificationId}/read`,
    );

    return response.data;
  },

  async markAllRead():
    Promise<NotificationMarkAllReadResponse> {
    const response =
      await api.patch<NotificationMarkAllReadResponse>(
        "/notifications/read-all",
      );

    return response.data;
  },
};