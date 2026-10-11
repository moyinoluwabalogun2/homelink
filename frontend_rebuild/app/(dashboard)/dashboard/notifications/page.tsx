"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bell,
  CheckCheck,
  CheckCircle2,
XCircle,
  Coins,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  toast,
} from "sonner";

import shared from "@/components/dashboard/DashboardPage.module.css";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatDate,
  titleCase,
} from "@/lib/formatters";

import {
  isMessageCreatedEvent,
  liveEventsService,
} from "@/services/live-events-service";

import {
  emitNotificationCountChange,
  notificationService,
} from "@/services/notification-service";

import type {
  Notification,
} from "@/types/notification";

import styles from "./page.module.css";


function isUuid(
  value: unknown,
): value is string {
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
  const data =
    item.data ?? {};

  if (
    item.notification_type ===
    "new_inquiry"
  ) {
    if (
      isUuid(
        data.inquiry_id,
      )
    ) {
      return (
        "/dashboard/inquiries"
        + `?thread=${encodeURIComponent(
          data.inquiry_id,
        )}`
      );
    }

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
    item.notification_type ===
    "security"
  ) {
    return "/dashboard/account";
  }

  return null;
}


function NotificationIcon({
  type,
}: {
  type:
    Notification[
      "notification_type"
    ];
}) {
  if (
    type === "new_inquiry"
  ) {
    return (
      <MessageSquare
        aria-hidden="true"
      />
    );
  }

  if (
    type === "payment_success"
  ) {
    return (
      <Coins
        aria-hidden="true"
      />
    );
  }

  if (
    type === "listing_approved"
  ) {
    return (
     <CheckCircle2
  aria-hidden="true"
/>
    );
  }

  if (
    type === "listing_rejected"
  ) {
    return (
     <XCircle
  aria-hidden="true"
/>
    );
  }

  if (
    type === "agent_approved"
  ) {
    return (
      <UserCheck
        aria-hidden="true"
      />
    );
  }

  return (
    <ShieldCheck
      aria-hidden="true"
    />
  );
}


function notificationLabel(
  item: Notification,
): string {
  if (
    item.notification_type ===
    "new_inquiry"
  ) {
    return "Message";
  }

  return titleCase(
    item.notification_type,
  );
}


export default function NotificationsPage() {
  const router =
    useRouter();

  const [
    items,
    setItems,
  ] = useState<
    Notification[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    unreadOnly,
    setUnreadOnly,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    openingId,
    setOpeningId,
  ] = useState<
    string | null
  >(null);

  const [
    hasMore,
    setHasMore,
  ] = useState(false);

  const [
    nextBefore,
    setNextBefore,
  ] = useState<
    string | null
  >(null);

  const [
    nextBeforeId,
    setNextBeforeId,
  ] = useState<
    string | null
  >(null);

  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const requestVersionRef =
    useRef(0);


  const unreadCount =
    useMemo(
      () =>
        items.filter(
          (item) =>
            !item.read_at,
        ).length,
      [
        items,
      ],
    );


  /* =========================================================
     LOAD NOTIFICATIONS
  ========================================================= */

  const load =
    useCallback(
      async (
        onlyUnread: boolean,
        options: {
          append?: boolean;
          before?: string | null;
          beforeId?: string | null;
        } = {},
      ) => {
        const {
          append = false,
          before = null,
          beforeId = null,
        } = options;

        const requestVersion =
          ++requestVersionRef.current;

        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setItems([]);
          setHasMore(false);
          setNextBefore(null);
          setNextBeforeId(null);
        }

        setError("");

        try {
          const result =
            await notificationService
              .list({
                unreadOnly:
                  onlyUnread,
                before,
                beforeId,
              });

          if (
            requestVersion !==
            requestVersionRef.current
          ) {
            return;
          }

          setItems(
            (current) => {
              if (!append) {
                return result.items;
              }

              const existingIds =
                new Set(
                  current.map(
                    (item) =>
                      item.id,
                  ),
                );

              return [
                ...current,
                ...result.items.filter(
                  (item) =>
                    !existingIds.has(
                      item.id,
                    ),
                ),
              ];
            },
          );

          setHasMore(
            result.has_more,
          );

          setNextBefore(
            result.next_before,
          );

          setNextBeforeId(
            result.next_before_id,
          );
        } catch (reason) {
          if (
            requestVersion !==
            requestVersionRef.current
          ) {
            return;
          }

          setError(
            getApiErrorMessage(
              reason,
              "Notifications could not be loaded.",
            ),
          );
        } finally {
          if (
            requestVersion ===
            requestVersionRef.current
          ) {
            setLoading(false);
            setLoadingMore(false);
          }
        }
      },
      [],
    );


  useEffect(() => {
    void load(
      unreadOnly,
    );

    return () => {
      requestVersionRef.current += 1;
    };
  }, [
    load,
    unreadOnly,
  ]);


  /* =========================================================
     LIVE NOTIFICATIONS
  ========================================================= */

  useEffect(() => {
    return liveEventsService.subscribe(
      (event) => {
        if (
          !isMessageCreatedEvent(
            event,
          ) ||
          !event.data.notification
        ) {
          return;
        }

        const incoming =
          event.data.notification;

        setItems(
          (current) => {
            if (
              current.some(
                (item) =>
                  item.id ===
                  incoming.id,
              )
            ) {
              return current;
            }

            return [
              incoming,
              ...current,
            ];
          },
        );
      },
    );
  }, []);


  /* =========================================================
     OPEN NOTIFICATION
  ========================================================= */

  const openNotification =
    async (
      item: Notification,
    ) => {
      if (
        openingId !== null ||
        markingAll
      ) {
        return;
      }

      setOpeningId(
        item.id,
      );

      try {
        if (!item.read_at) {
          const updated =
            await notificationService
              .markRead(
                item.id,
              );

          setItems(
            (current) =>
              unreadOnly
                ? current.filter(
                    (entry) =>
                      entry.id !==
                      item.id,
                  )
                : current.map(
                    (entry) =>
                      entry.id ===
                      item.id
                        ? updated
                        : entry,
                  ),
          );

          emitNotificationCountChange({
            delta: -1,
          });
        }

        const destination =
          getNotificationDestination(
            item,
          );

        if (destination) {
          router.push(
            destination,
          );

          return;
        }

        toast.info(
          "This notification does not have a destination yet.",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Notification could not be opened.",
          ),
        );
      } finally {
        setOpeningId(null);
      }
    };


  /* =========================================================
     MARK ALL READ
  ========================================================= */

  const markAll =
    async () => {
      if (
        markingAll ||
        loading ||
        loadingMore ||
        unreadCount === 0
      ) {
        return;
      }

      setMarkingAll(true);

      try {
        const result =
          await notificationService
            .markAllRead();

        if (unreadOnly) {
          setItems([]);
          setHasMore(false);
          setNextBefore(null);
          setNextBeforeId(null);
        } else {
          const readAt =
            new Date()
              .toISOString();

          setItems(
            (current) =>
              current.map(
                (item) => ({
                  ...item,
                  read_at:
                    item.read_at ??
                    readAt,
                }),
              ),
          );
        }

        emitNotificationCountChange({
          absolute: 0,
        });

        toast.success(
          result.message,
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Notifications could not be marked as read.",
          ),
        );
      } finally {
        setMarkingAll(false);
      }
    };


  /* =========================================================
     LOAD MORE
  ========================================================= */

  const loadMore =
    () => {
      if (
        loadingMore ||
        loading ||
        markingAll ||
        !hasMore ||
        !nextBefore ||
        !nextBeforeId
      ) {
        return;
      }

      void load(
        unreadOnly,
        {
          append: true,
          before:
            nextBefore,
          beforeId:
            nextBeforeId,
        },
      );
    };


  return (
    <div
      className={shared.page}
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

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
            Messages, listing decisions,
            payments and account updates
            appear here.
          </p>
        </div>

        <button
          type="button"
          className={
            shared.secondaryButton
          }
          disabled={
            markingAll ||
            loading ||
            loadingMore ||
            unreadCount === 0
          }
          onClick={() => {
            void markAll();
          }}
        >
          {markingAll ? (
            <Loader2
              aria-hidden="true"
              className={
                styles.spin
              }
            />
          ) : (
            <CheckCheck
              aria-hidden="true"
            />
          )}

          {markingAll
            ? "Marking…"
            : unreadCount === 0
              ? "All read"
              : `Mark all read (${unreadCount})`}
        </button>
      </header>


      {/* =====================================================
          FILTER
      ====================================================== */}

      <section
        className={
          styles.toolbar
        }
        aria-label={
          "Notification filters"
        }
      >
        <div>
          <strong>
            Activity feed
          </strong>

          <span>
            {loading
              ? "Loading updates…"
              : `${items.length} ${
                  items.length === 1
                    ? "notification"
                    : "notifications"
                } shown`}
          </span>
        </div>

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
            disabled={
              loading ||
              markingAll
            }
            onChange={
              (event) => {
                setUnreadOnly(
                  event.target
                    .checked,
                );
              }
            }
          />

          <span>
            Show unread only
          </span>
        </label>
      </section>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {error ? (
        <div
          className={shared.error}
          role="alert"
        >
          <span>
            {error}
          </span>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void load(
                unreadOnly,
              );
            }}
          >
            <RefreshCw
              aria-hidden="true"
              className={
                loading
                  ? styles.spin
                  : undefined
              }
            />

            {loading
              ? "Trying again…"
              : "Try again"}
          </button>
        </div>
      ) : null}


      {/* =====================================================
          LOADING
      ====================================================== */}

      {loading ? (
        <div
          className={styles.list}
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={
            "Loading notifications"
          }
        >
          <span
            className={
              styles.srOnly
            }
          >
            Loading notifications…
          </span>

          {Array.from(
            {
              length: 5,
            },
            (
              _,
              index,
            ) => (
              <div
                key={index}
                className={
                  styles.skeleton
                }
                aria-hidden="true"
              >
                <span
                  className={
                    styles.skeletonIcon
                  }
                />

                <span
                  className={
                    styles.skeletonCopy
                  }
                >
                  <i />
                  <i />
                  <i />
                </span>

                <span
                  className={
                    styles.skeletonDate
                  }
                />
              </div>
            ),
          )}
        </div>
      ) : null}


      {/* =====================================================
          EMPTY
      ====================================================== */}

      {!loading &&
      !error &&
      items.length === 0 ? (
        <section
          className={shared.empty}
          aria-labelledby={
            "notifications-empty-title"
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

          <h2
            id="notifications-empty-title"
          >
            {unreadOnly
              ? "No unread notifications"
              : "You are all caught up"}
          </h2>

          <p>
            {unreadOnly
              ? "You have read every notification currently in your activity feed."
              : "New HomeLink activity will appear here when there is something to review."}
          </p>

          {unreadOnly ? (
            <button
              type="button"
              className={
                shared.secondaryButton
              }
              onClick={() => {
                setUnreadOnly(false);
              }}
            >
              Show all notifications
            </button>
          ) : null}
        </section>
      ) : null}


      {/* =====================================================
          NOTIFICATION LIST
      ====================================================== */}

      {!loading &&
      !error &&
      items.length > 0 ? (
        <div
          className={styles.list}
          role="list"
          aria-label={
            unreadOnly
              ? "Unread notifications"
              : "Notifications"
          }
        >
          {items.map(
            (item) => {
              const isOpening =
                openingId ===
                item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="listitem"
                  disabled={
                    openingId !== null ||
                    markingAll
                  }
                  className={[
                    styles.card,

                    !item.read_at
                      ? styles.unread
                      : "",

                    isOpening
                      ? styles.opening
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={
                    `${
                      !item.read_at
                        ? "Unread: "
                        : ""
                    }${item.title}`
                  }
                  onClick={() => {
                    void openNotification(
                      item,
                    );
                  }}
                >
                  <span
                    className={
                      styles.icon
                    }
                  >
                    {isOpening ? (
                      <Loader2
                        aria-hidden="true"
                        className={
                          styles.spin
                        }
                      />
                    ) : (
                      <NotificationIcon
                        type={
                          item.notification_type
                        }
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
                      {notificationLabel(
                        item,
                      )}
                    </span>

                    <strong>
                      {item.title}
                    </strong>

                    <span>
                      {item.message}
                    </span>
                  </span>

                  <span
                    className={
                      styles.date
                    }
                  >
                    <time
                      dateTime={
                        item.created_at
                      }
                    >
                      {formatDate(
                        item.created_at,
                      )}
                    </time>

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


      {/* =====================================================
          PAGINATION
      ====================================================== */}

      {!loading &&
      !error &&
      items.length > 0 &&
      hasMore ? (
        <div
          className={
            styles.loadMoreRow
          }
        >
          <button
            type="button"
            className={
              styles.loadMore
            }
            disabled={
              loadingMore ||
              markingAll ||
              openingId !== null
            }
            onClick={
              loadMore
            }
          >
            {loadingMore ? (
              <Loader2
                aria-hidden="true"
                className={
                  styles.spin
                }
              />
            ) : (
              <RefreshCw
                aria-hidden="true"
              />
            )}

            {loadingMore
              ? "Loading…"
              : "Load more notifications"}
          </button>
        </div>
      ) : null}
    </div>
  );
}