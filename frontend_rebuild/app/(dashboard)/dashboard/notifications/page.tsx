"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Bell,
  CheckCheck,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  toast,
} from "sonner";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatDate,
  titleCase,
} from "@/lib/formatters";

import {
  notificationService,
} from "@/services/notification-service";

import type {
  Notification,
} from "@/types/notification";

import shared from "@/components/dashboard/DashboardPage.module.css";
import styles from "./page.module.css";


const NOTIFICATIONS_CHANGED_EVENT =
  "homelink:notifications-changed";


function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}


function getNotificationDestination(
  item: Notification,
): string | null {
  const data = item.data ?? {};

  if (
    item.notification_type === "new_inquiry"
  ) {
    if (isUuid(data.inquiry_id)) {
      return `/dashboard/inquiries?thread=${encodeURIComponent(
        data.inquiry_id,
      )}`;
    }

    // Old notification with missing/invalid inquiry ID.
    // Open Messages safely instead of sending "None" to FastAPI.
    return "/dashboard/inquiries";
  }

  if (
    item.notification_type ===
    "payment_success"
  ) {
    return "/dashboard/credits";
  }

  if (
    item.notification_type ===
      "listing_approved" ||
    item.notification_type ===
      "listing_rejected"
  ) {
    return "/dashboard/listings";
  }

  if (
    item.notification_type ===
      "agent_approved" ||
    item.notification_type ===
      "agent_rejected"
  ) {
    return "/dashboard/agent-application";
  }

  if (
    item.notification_type === "security"
  ) {
    return "/dashboard/account";
  }

  return null;
}


function notifyNotificationCountChanged() {
  window.dispatchEvent(
    new Event(
      NOTIFICATIONS_CHANGED_EVENT,
    ),
  );
}


export default function NotificationsPage() {
  const router =
    useRouter();


  const [
    items,
    setItems,
  ] =
    useState<
      Notification[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    unreadOnly,
    setUnreadOnly,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    openingId,
    setOpeningId,
  ] =
    useState<
      string | null
    >(null);


  const load =
    useCallback(
      async (
        onlyUnread: boolean,
      ) => {
        setLoading(true);
        setError("");

        try {
          const result =
            await notificationService.list(
              onlyUnread,
            );

          setItems(
            result,
          );
        } catch (
          reason
        ) {
          setError(
            getApiErrorMessage(
              reason,
              "Notifications could not be loaded.",
            ),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );


  useEffect(() => {
    void load(
      unreadOnly,
    );
  }, [
    load,
    unreadOnly,
  ]);


  const openNotification =
    async (
      item: Notification,
    ) => {
      if (
        openingId
      ) {
        return;
      }


      setOpeningId(
        item.id,
      );


      try {
        if (
          !item.read_at
        ) {
          const updated =
            await notificationService.markRead(
              item.id,
            );


          setItems(
            (
              current,
            ) =>
              current.map(
                (
                  entry,
                ) =>
                  entry.id ===
                  item.id
                    ? updated
                    : entry,
              ),
          );


          notifyNotificationCountChanged();
        }


        const destination =
          getNotificationDestination(
            item,
          );


        if (
          destination
        ) {
          router.push(
            destination,
          );

          return;
        }


        toast.info(
          "This notification does not have a destination yet.",
        );
      } catch (
        reason
      ) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Notification could not be opened.",
          ),
        );
      } finally {
        setOpeningId(
          null,
        );
      }
    };


  const markAll =
    async () => {
      try {
        const result =
          await notificationService.markAllRead();


        if (
          unreadOnly
        ) {
          setItems([]);
        } else {
          const now =
            new Date().toISOString();


          setItems(
            (
              current,
            ) =>
              current.map(
                (
                  item,
                ) => ({
                  ...item,

                  read_at:
                    item.read_at ??
                    now,
                }),
              ),
          );
        }


        notifyNotificationCountChanged();


        toast.success(
          result.message,
        );
      } catch (
        reason
      ) {
        toast.error(
          getApiErrorMessage(
            reason,
          ),
        );
      }
    };


  return (
    <div
      className={
        shared.page
      }
    >
      <header
        className={
          shared.pageHeader
        }
      >
        <div>
          <span
            className={
              shared.eyebrow
            }
          >
            <Bell
              aria-hidden="true"
            />

            Updates
          </span>

          <h1>
            Notifications.
          </h1>

          <p>
            Messages, listing
            decisions, payments
            and account updates
            appear here.
          </p>
        </div>


        <button
          type="button"
          className={
            shared.secondaryButton
          }
          onClick={() =>
            void markAll()
          }
        >
          <CheckCheck
            aria-hidden="true"
          />

          Mark all read
        </button>
      </header>


      <label
        className={
          styles.filter
        }
      >
        <input
          type="checkbox"
          checked={
            unreadOnly
          }
          onChange={(
            event,
          ) =>
            setUnreadOnly(
              event.target.checked,
            )
          }
        />

        <span>
          Show unread only
        </span>
      </label>


      {error ? (
        <div
          className={
            shared.error
          }
        >
          {error}
        </div>
      ) : null}


      {loading ? (
        <div
          className={
            styles.list
          }
        >
          {Array.from(
            {
              length: 4,
            },
            (
              _,
              index,
            ) => (
              <div
                key={
                  index
                }
                className={
                  styles.skeleton
                }
              />
            ),
          )}
        </div>
      ) : null}


      {!loading &&
      items.length ===
        0 ? (
        <div
          className={
            shared.empty
          }
        >
          <span
            className={
              shared.emptyIcon
            }
          >
            <Bell
              aria-hidden="true"
            />
          </span>

          <h2>
            You are all caught up
          </h2>

          <p>
            New HomeLink activity
            will appear here.
          </p>
        </div>
      ) : null}


      {!loading &&
      items.length >
        0 ? (
        <div
          className={
            styles.list
          }
        >
          {items.map(
            (
              item,
            ) => {
              const isMessage =
                item.notification_type ===
                "new_inquiry";


              return (
                <button
                  key={
                    item.id
                  }
                  type="button"
                  disabled={
                    openingId ===
                    item.id
                  }
                  className={`${styles.card} ${
                    !item.read_at
                      ? styles.unread
                      : ""
                  }`}
                  onClick={() =>
                    void openNotification(
                      item,
                    )
                  }
                >
                  <span
                    className={
                      styles.icon
                    }
                  >
                    {isMessage ? (
                      <MessageSquare
                        aria-hidden="true"
                      />
                    ) : (
                      <ShieldCheck
                        aria-hidden="true"
                      />
                    )}
                  </span>


                  <span
                    className={
                      styles.copy
                    }
                  >
                    <span
                      className={
                        styles.type
                      }
                    >
                      {isMessage
                        ? "Message"
                        : titleCase(
                            item.notification_type,
                          )}
                    </span>

                    <strong>
                      {
                        item.title
                      }
                    </strong>

                    <span>
                      {
                        item.message
                      }
                    </span>
                  </span>


                  <span
                    className={
                      styles.date
                    }
                  >
                    {formatDate(
                      item.created_at,
                    )}

                    {!item.read_at ? (
                      <b>
                        New
                      </b>
                    ) : null}
                  </span>
                </button>
              );
            },
          )}
        </div>
      ) : null}
    </div>
  );
}