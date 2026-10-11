"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Home,
  Inbox,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Store,
  X,
} from "lucide-react";

import {
  toast,
} from "sonner";

import {
  useAuth,
} from "@/context/AuthContext";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  titleCase,
} from "@/lib/formatters";

import {
  engagementService,
} from "@/services/engagement-service";

import {
  isMessageCreatedEvent,
  liveEventsService,
} from "@/services/live-events-service";

import type {
  ConversationListingType,
  InquiryInboxItem,
  InquiryMessage,
  InquiryThread,
} from "@/types/engagement";

import styles from "./page.module.css";


const MESSAGE_READ_EVENT =
  "homelink:message-read";


function initials(
  value: string,
): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase() ??
        "",
    )
    .join("");
}


function formatConversationTime(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const today =
    new Date();

  const sameDay =
    date.getFullYear() ===
      today.getFullYear() &&
    date.getMonth() ===
      today.getMonth() &&
    date.getDate() ===
      today.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat(
      undefined,
      {
        hour: "numeric",
        minute: "2-digit",
      },
    ).format(date);
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month: "short",
      day: "numeric",
    },
  ).format(date);
}


function formatMessageTime(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date);
}


function isUuid(
  value: string | null,
): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}


function ListingIcon({
  type,
}: {
  type:
    ConversationListingType;
}) {
  if (
    type === "marketplace"
  ) {
    return (
      <Store
        aria-hidden="true"
      />
    );
  }

  if (
    type === "buy_property"
  ) {
    return (
      <Building2
        aria-hidden="true"
      />
    );
  }

  return (
    <Home
      aria-hidden="true"
    />
  );
}


function sortInbox(
  items: InquiryInboxItem[],
): InquiryInboxItem[] {
  return [...items].sort(
    (
      first,
      second,
    ) =>
      new Date(
        second.last_message_at,
      ).getTime() -
      new Date(
        first.last_message_at,
      ).getTime(),
  );
}


export default function InquiriesPage() {
  const {
    user,
  } = useAuth();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const rawRequestedThread =
    searchParams.get(
      "thread",
    );

  const requestedThread =
    isUuid(
      rawRequestedThread,
    )
      ? rawRequestedThread
      : null;

  const [
    inbox,
    setInbox,
  ] = useState<
    InquiryInboxItem[]
  >([]);

  const inboxRef =
    useRef<
      InquiryInboxItem[]
    >([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState<
    string | null
  >(requestedThread);

  const selectedIdRef =
    useRef<
      string | null
    >(requestedThread);

  const [
    mobileThreadOpen,
    setMobileThreadOpen,
  ] = useState(
    Boolean(
      requestedThread,
    ),
  );

  const [
    thread,
    setThread,
  ] = useState<
    InquiryThread | null
  >(null);

  const [
    loadingInbox,
    setLoadingInbox,
  ] = useState(true);

  const [
    loadingThread,
    setLoadingThread,
  ] = useState(false);

  const [
    loadingOlder,
    setLoadingOlder,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    closing,
    setClosing,
  ] = useState(false);

  const [
    composer,
    setComposer,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    threadError,
    setThreadError,
  ] = useState("");

  const inboxRequestRef =
    useRef(0);

  const threadRequestRef =
    useRef(0);

  const readTimerRef =
    useRef<
      number | null
    >(null);

  const messagesRef =
    useRef<HTMLDivElement>(
      null,
    );

  const previousThreadIdRef =
    useRef<string | null>(
      null,
    );

  const previousMessageCountRef =
    useRef(0);


  /* =========================================================
     SYNCHRONISED REFS
  ========================================================= */

  useEffect(() => {
    inboxRef.current =
      inbox;
  }, [
    inbox,
  ]);


  useEffect(() => {
    selectedIdRef.current =
      selectedId;
  }, [
    selectedId,
  ]);


  /* =========================================================
     DEEP-LINKED CONVERSATION
  ========================================================= */

  useEffect(() => {
    if (
      !requestedThread
    ) {
      return;
    }

    setSelectedId(
      requestedThread,
    );

    setMobileThreadOpen(
      true,
    );
  }, [
    requestedThread,
  ]);


  /* =========================================================
     LOAD INBOX
  ========================================================= */

  const loadInbox =
    useCallback(
      async (
        silent = false,
      ) => {
        const requestVersion =
          ++inboxRequestRef.current;

        if (!silent) {
          setLoadingInbox(true);
        }

        setError("");

        try {
          const items =
            await engagementService
              .listInbox();

          if (
            requestVersion !==
            inboxRequestRef.current
          ) {
            return;
          }

          setInbox(items);

          if (
            !requestedThread &&
            !selectedIdRef.current &&
            items.length > 0
          ) {
            setSelectedId(
              items[0].id,
            );
          }
        } catch (reason) {
          if (
            requestVersion !==
            inboxRequestRef.current
          ) {
            return;
          }

          if (!silent) {
            setError(
              getApiErrorMessage(
                reason,
                "Messages could not be loaded.",
              ),
            );
          }
        } finally {
          if (
            requestVersion ===
              inboxRequestRef.current &&
            !silent
          ) {
            setLoadingInbox(false);
          }
        }
      },
      [
        requestedThread,
      ],
    );


  useEffect(() => {
    void loadInbox();

    return () => {
      inboxRequestRef.current += 1;
    };
  }, [
    loadInbox,
  ]);


  /* =========================================================
     LOAD SELECTED THREAD
  ========================================================= */

  useEffect(() => {
    const requestVersion =
      ++threadRequestRef.current;

    if (!selectedId) {
      setThread(null);
      setThreadError("");
      setLoadingThread(false);
      setComposer("");

      return;
    }

    const inquiryId =
      selectedId;

    setLoadingThread(true);
    setLoadingOlder(false);
    setThread(null);
    setThreadError("");
    setComposer("");

    const loadThread =
      async () => {
        try {
          const result =
            await engagementService
              .getInquiryThread(
                inquiryId,
              );

          if (
            requestVersion !==
            threadRequestRef.current
          ) {
            return;
          }

          setThread(result);

          const inboxItem =
            inboxRef.current.find(
              (item) =>
                item.id ===
                inquiryId,
            );

          if (
            inboxItem?.unread
          ) {
            void engagementService
              .markInquiryRead(
                inquiryId,
              )
              .then(() => {
                if (
                  requestVersion !==
                  threadRequestRef.current
                ) {
                  return;
                }

                setInbox(
                  (current) =>
                    current.map(
                      (item) =>
                        item.id ===
                        inquiryId
                          ? {
                              ...item,
                              unread:
                                false,
                            }
                          : item,
                    ),
                );

                window.dispatchEvent(
                  new CustomEvent(
                    MESSAGE_READ_EVENT,
                    {
                      detail: {
                        inquiryId,
                      },
                    },
                  ),
                );
              })
              .catch(
                () =>
                  undefined,
              );
          }
        } catch (reason) {
          if (
            requestVersion !==
            threadRequestRef.current
          ) {
            return;
          }

          setThreadError(
            getApiErrorMessage(
              reason,
              "Conversation could not be opened.",
            ),
          );
        } finally {
          if (
            requestVersion ===
            threadRequestRef.current
          ) {
            setLoadingThread(false);
          }
        }
      };

    void loadThread();

    return () => {
      threadRequestRef.current += 1;
    };
  }, [
    selectedId,
  ]);


  /* =========================================================
     SCROLL TO NEWEST MESSAGE
  ========================================================= */

  useEffect(() => {
    if (
      !thread ||
      !messagesRef.current
    ) {
      return;
    }

    const changedThread =
      previousThreadIdRef.current !==
      thread.id;

    const addedAtEnd =
      thread.messages.length >
      previousMessageCountRef.current;

    if (
      changedThread ||
      addedAtEnd
    ) {
      messagesRef.current
        .scrollTo({
          top:
            messagesRef.current
              .scrollHeight,
          behavior:
            changedThread
              ? "auto"
              : "smooth",
        });
    }

    previousThreadIdRef.current =
      thread.id;

    previousMessageCountRef.current =
      thread.messages.length;
  }, [
    thread,
  ]);


  /* =========================================================
     LIVE MESSAGE DELIVERY
  ========================================================= */

  useEffect(() => {
    const unsubscribe =
      liveEventsService.subscribe(
        (event) => {
          if (
            !isMessageCreatedEvent(
              event,
            )
          ) {
            return;
          }

          const data =
            event.data;

          const message =
            data.message;

          const inquiryId =
            data.inquiry_id;

          const currentlySelected =
            selectedIdRef.current ===
            inquiryId;

          const visible =
            document.visibilityState ===
            "visible";

          const activelyReading =
            currentlySelected &&
            visible;

          const existsInInbox =
            inboxRef.current.some(
              (item) =>
                item.id ===
                inquiryId,
            );

          if (existsInInbox) {
            setInbox(
              (current) =>
                sortInbox(
                  current.map(
                    (item) =>
                      item.id ===
                      inquiryId
                        ? {
                            ...item,
                            status:
                              data.status,
                            last_message_preview:
                              message.message,
                            last_message_at:
                              message.created_at,
                            last_message_sender_id:
                              message.sender_id,
                            unread:
                              !activelyReading,
                          }
                        : item,
                  ),
                ),
            );
          } else {
            void loadInbox(true);
          }

          if (
            currentlySelected
          ) {
            setThread(
              (current) => {
                if (
                  !current ||
                  current.id !==
                    inquiryId
                ) {
                  return current;
                }

                const duplicate =
                  current.messages.some(
                    (existing) =>
                      existing.id ===
                      message.id,
                  );

                if (duplicate) {
                  return current;
                }

                return {
                  ...current,
                  status:
                    data.status,
                  messages: [
                    ...current.messages,
                    message,
                  ],
                };
              },
            );
          }

          if (
            activelyReading
          ) {
            if (
              readTimerRef.current
            ) {
              window.clearTimeout(
                readTimerRef.current,
              );
            }

            readTimerRef.current =
              window.setTimeout(
                () => {
                  void engagementService
                    .markInquiryRead(
                      inquiryId,
                    )
                    .then(() => {
                      window.dispatchEvent(
                        new CustomEvent(
                          MESSAGE_READ_EVENT,
                          {
                            detail: {
                              inquiryId,
                            },
                          },
                        ),
                      );
                    })
                    .catch(
                      () =>
                        undefined,
                    );

                  readTimerRef.current =
                    null;
                },
                450,
              );

            return;
          }

          toast.info(
            `New message about "${data.listing_title}".`,
          );
        },
      );

    return () => {
      if (
        readTimerRef.current
      ) {
        window.clearTimeout(
          readTimerRef.current,
        );

        readTimerRef.current =
          null;
      }

      unsubscribe();
    };
  }, [
    loadInbox,
  ]);


  /* =========================================================
     COUNTS
  ========================================================= */

  const unreadCount =
    useMemo(
      () =>
        inbox.reduce(
          (
            total,
            item,
          ) =>
            total +
            (
              item.unread
                ? 1
                : 0
            ),
          0,
        ),
      [
        inbox,
      ],
    );


  /* =========================================================
     SELECT CONVERSATION
  ========================================================= */

  const openConversation =
    (
      inquiryId: string,
    ) => {
      setSelectedId(
        inquiryId,
      );

      setMobileThreadOpen(
        true,
      );

      router.replace(
        `/dashboard/inquiries?thread=${encodeURIComponent(
          inquiryId,
        )}`,
        {
          scroll: false,
        },
      );
    };


  const backToInbox =
    () => {
      setMobileThreadOpen(
        false,
      );

      router.replace(
        "/dashboard/inquiries",
        {
          scroll: false,
        },
      );
    };


  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  const sendMessage =
    async () => {
      if (
        !thread ||
        sending ||
        closing ||
        thread.status ===
          "closed"
      ) {
        return;
      }

      const text =
        composer.trim();

      if (!text) {
        return;
      }

      const inquiryId =
        thread.id;

      const ownerIsReplying =
        user?.id ===
          thread.recipient.id &&
        thread.status ===
          "open";

      setSending(true);

      try {
        const message =
          await engagementService
            .sendInquiryMessage(
              inquiryId,
              text,
            );

        setThread(
          (current) => {
            if (
              !current ||
              current.id !==
                inquiryId
            ) {
              return current;
            }

            const duplicate =
              current.messages.some(
                (existing) =>
                  existing.id ===
                  message.id,
              );

            return {
              ...current,
              status:
                ownerIsReplying
                  ? "responded"
                  : current.status,
              responded_at:
                ownerIsReplying
                  ? message.created_at
                  : current.responded_at,
              messages:
                duplicate
                  ? current.messages
                  : [
                      ...current.messages,
                      message,
                    ],
            };
          },
        );

        setInbox(
          (current) =>
            sortInbox(
              current.map(
                (item) =>
                  item.id ===
                  inquiryId
                    ? {
                        ...item,
                        status:
                          ownerIsReplying
                            ? "responded"
                            : item.status,
                        last_message_preview:
                          message.message,
                        last_message_at:
                          message.created_at,
                        last_message_sender_id:
                          message.sender_id,
                        unread: false,
                      }
                    : item,
              ),
            ),
        );

        if (
          selectedIdRef.current ===
          inquiryId
        ) {
          setComposer("");
        }
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Message could not be sent.",
          ),
        );
      } finally {
        setSending(false);
      }
    };


  /* =========================================================
     LOAD OLDER MESSAGES
  ========================================================= */

  const loadOlder =
    async () => {
      if (
        !thread ||
        !thread.has_more ||
        !thread.next_before ||
        loadingOlder
      ) {
        return;
      }

      const inquiryId =
        thread.id;

      const before =
        thread.next_before;

      setLoadingOlder(true);

      try {
        const older =
          await engagementService
            .getInquiryThread(
              inquiryId,
              {
                before,
              },
            );

        setThread(
          (current) => {
            if (
              !current ||
              current.id !==
                inquiryId
            ) {
              return current;
            }

            const existing =
              new Set(
                current.messages.map(
                  (message) =>
                    message.id,
                ),
              );

            const prepend =
              older.messages.filter(
                (message) =>
                  !existing.has(
                    message.id,
                  ),
              );

            return {
              ...current,
              messages: [
                ...prepend,
                ...current.messages,
              ],
              has_more:
                older.has_more,
              next_before:
                older.next_before,
            };
          },
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Older messages could not be loaded.",
          ),
        );
      } finally {
        setLoadingOlder(false);
      }
    };


  /* =========================================================
     CLOSE CONVERSATION
  ========================================================= */

  const closeConversation =
    async () => {
      if (
        !thread ||
        closing ||
        sending ||
        thread.status ===
          "closed"
      ) {
        return;
      }

      const inquiryId =
        thread.id;

      setClosing(true);

      try {
        const updated =
          await engagementService
            .updateInquiryStatus(
              inquiryId,
              "closed",
            );

        setThread(
          (current) =>
            current &&
            current.id ===
              inquiryId
              ? {
                  ...current,
                  status:
                    "closed",
                  closed_at:
                    updated.closed_at,
                }
              : current,
        );

        setInbox(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                inquiryId
                  ? {
                      ...item,
                      status:
                        "closed",
                    }
                  : item,
            ),
        );

        toast.success(
          "Conversation closed.",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Conversation could not be closed.",
          ),
        );
      } finally {
        setClosing(false);
      }
    };


  const otherPerson =
    thread
      ? thread.sender.id ===
          user?.id
        ? thread.recipient
        : thread.sender
      : null;


  return (
    <div
      className={styles.page}
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header
        className={
          styles.pageHeader
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            <MessageSquare
              aria-hidden="true"
            />

            HomeLink messages
          </span>

          <h1>
            Messages.
          </h1>

          <p>
            Talk directly with buyers,
            renters and listing owners
            without leaving HomeLink.
          </p>
        </div>

        <div
          className={
            styles.headerMeta
          }
          aria-live="polite"
        >
          <span>
            {inbox.length}{" "}
            {inbox.length === 1
              ? "conversation"
              : "conversations"}
          </span>

          <strong>
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "All caught up"}
          </strong>
        </div>
      </header>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {error ? (
        <div
          className={styles.error}
          role="alert"
        >
          <span>
            {error}
          </span>

          <button
            type="button"
            disabled={loadingInbox}
            onClick={() => {
              void loadInbox();
            }}
          >
            <RefreshCw
              aria-hidden="true"
              className={
                loadingInbox
                  ? styles.spin
                  : undefined
              }
            />

            {loadingInbox
              ? "Retrying…"
              : "Retry"}
          </button>
        </div>
      ) : null}


      {/* =====================================================
          MESSAGING SHELL
      ====================================================== */}

      <section
        className={[
          styles.messagingShell,

          mobileThreadOpen
            ? styles.mobileThreadVisible
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={
          "HomeLink conversations"
        }
      >
        {/* ===================================================
            INBOX
        ==================================================== */}

        <aside
          className={
            styles.inboxPane
          }
          aria-label={
            "Conversation inbox"
          }
        >
          <div
            className={
              styles.inboxHeader
            }
          >
            <div>
              <Inbox
                aria-hidden="true"
              />

              <strong>
                Conversations
              </strong>
            </div>

            {unreadCount > 0 ? (
              <span
                aria-label={
                  `${unreadCount} unread conversations`
                }
              >
                {unreadCount}
              </span>
            ) : null}
          </div>

          <div
            className={
              styles.conversationList
            }
            role="list"
            aria-busy={
              loadingInbox
            }
          >
            {loadingInbox ? (
              <>
                <span
                  className={
                    styles.srOnly
                  }
                >
                  Loading conversations…
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
                        styles.conversationSkeleton
                      }
                      aria-hidden="true"
                    />
                  ),
                )}
              </>
            ) : null}

            {!loadingInbox &&
            !error &&
            inbox.length === 0 ? (
              <div
                className={
                  styles.emptyInbox
                }
              >
                <span>
                  <MessageSquare
                    aria-hidden="true"
                  />
                </span>

                <strong>
                  No messages yet
                </strong>

                <p>
                  Contact someone from a
                  listing and your
                  conversation will appear
                  here.
                </p>
              </div>
            ) : null}

            {!loadingInbox
              ? inbox.map(
                  (item) => {
                    const active =
                      selectedId ===
                      item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="listitem"
                        aria-current={
  active
    ? "true"
    : undefined
}
                        className={[
                          styles.conversationItem,

                          active
                            ? styles.activeConversation
                            : "",

                          item.unread
                            ? styles.unreadConversation
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => {
                          openConversation(
                            item.id,
                          );
                        }}
                      >
                        <span
                          className={
                            styles.avatar
                          }
                        >
                          {item.other_user
                            .profile_image_url ? (
                            <Image
                              src={
                                item.other_user
                                  .profile_image_url
                              }
                              alt=""
                              width={46}
                              height={46}
                            />
                          ) : (
                            initials(
                              item.other_user
                                .full_name,
                            )
                          )}
                        </span>

                        <span
                          className={
                            styles.conversationCopy
                          }
                        >
                          <span
                            className={
                              styles.conversationTop
                            }
                          >
                            <strong>
                              {
                                item.other_user
                                  .full_name
                              }
                            </strong>

                            <time
                              dateTime={
                                item.last_message_at
                              }
                            >
                              {formatConversationTime(
                                item.last_message_at,
                              )}
                            </time>
                          </span>

                          <span
                            className={
                              styles.listingLabel
                            }
                          >
                            <ListingIcon
                              type={
                                item.listing
                                  .listing_type
                              }
                            />

                            {
                              item.listing
                                .title
                            }
                          </span>

                          <span
                            className={
                              styles.previewRow
                            }
                          >
                            <span
                              className={
                                styles.preview
                              }
                            >
                              {item
                                .last_message_sender_id ===
                              user?.id
                                ? "You: "
                                : ""}

                              {
                                item
                                  .last_message_preview
                              }
                            </span>

                            {item.unread ? (
                              <b
                                aria-label={
                                  "Unread conversation"
                                }
                              />
                            ) : null}
                          </span>
                        </span>

                        <ChevronRight
                          aria-hidden="true"
                          className={
                            styles.rowArrow
                          }
                        />
                      </button>
                    );
                  },
                )
              : null}
          </div>
        </aside>


        {/* ===================================================
            THREAD
        ==================================================== */}

        <div
          className={
            styles.threadPane
          }
        >
          {!selectedId ? (
            <div
              className={
                styles.noThread
              }
            >
              <span>
                <MessageSquare
                  aria-hidden="true"
                />
              </span>

              <h2>
                Select a conversation
              </h2>

              <p>
                Your messages will
                appear here.
              </p>
            </div>
          ) : null}


          {selectedId &&
          loadingThread ? (
            <div
              className={
                styles.threadLoading
              }
              role="status"
              aria-live="polite"
            >
              <Loader2
                aria-hidden="true"
                className={
                  styles.spin
                }
              />

              Loading conversation…
            </div>
          ) : null}


          {selectedId &&
          !loadingThread &&
          threadError ? (
            <div
              className={
                styles.threadError
              }
              role="alert"
            >
              <span>
                <MessageSquare
                  aria-hidden="true"
                />
              </span>

              <strong>
                Conversation unavailable
              </strong>

              <p>
                {threadError}
              </p>

              <button
                type="button"
                onClick={() => {
                  const retryId =
                    selectedId;

                  setSelectedId(null);

                  window.setTimeout(
                    () => {
                      setSelectedId(
                        retryId,
                      );
                    },
                    0,
                  );
                }}
              >
                <RefreshCw
                  aria-hidden="true"
                />

                Try again
              </button>
            </div>
          ) : null}


          {selectedId &&
          !loadingThread &&
          !threadError &&
          thread &&
          otherPerson ? (
            <>
              <div
                className={
                  styles.threadHeader
                }
              >
                <button
                  type="button"
                  className={
                    styles.mobileBack
                  }
                  onClick={
                    backToInbox
                  }
                  aria-label={
                    "Back to conversations"
                  }
                >
                  <ArrowLeft
                    aria-hidden="true"
                  />
                </button>

                <span
                  className={
                    styles.headerAvatar
                  }
                >
                  {otherPerson
                    .profile_image_url ? (
                    <Image
                      src={
                        otherPerson
                          .profile_image_url
                      }
                      alt=""
                      width={44}
                      height={44}
                    />
                  ) : (
                    initials(
                      otherPerson
                        .full_name,
                    )
                  )}
                </span>

                <div
                  className={
                    styles.threadIdentity
                  }
                >
                  <strong>
                    {
                      otherPerson
                        .full_name
                    }
                  </strong>

                  <span>
                    {titleCase(
                      otherPerson.role,
                    )}
                  </span>
                </div>

                <div
                  className={
                    styles.threadActions
                  }
                >
                  <span
                    className={[
                      styles.status,

                      thread.status ===
                      "closed"
                        ? styles.closedStatus
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {titleCase(
                      thread.status,
                    )}
                  </span>

                  {thread.status !==
                  "closed" ? (
                    <button
                      type="button"
                      disabled={
                        closing ||
                        sending
                      }
                      onClick={() => {
                        void closeConversation();
                      }}
                    >
                      {closing ? (
                        <Loader2
                          aria-hidden="true"
                          className={
                            styles.spin
                          }
                        />
                      ) : (
                        <X
                          aria-hidden="true"
                        />
                      )}

                      {closing
                        ? "Closing…"
                        : "Close"}
                    </button>
                  ) : null}
                </div>
              </div>


              <Link
                href={
                  `/listings/${thread.listing.id}`
                }
                className={
                  styles.listingContext
                }
              >
                <span>
                  <ListingIcon
                    type={
                      thread.listing
                        .listing_type
                    }
                  />
                </span>

                <div>
                  <small>
                    {titleCase(
                      thread.listing
                        .listing_type,
                    )}
                  </small>

                  <strong>
                    {
                      thread.listing
                        .title
                    }
                  </strong>
                </div>

                <ChevronRight
                  aria-hidden="true"
                />
              </Link>


              <div
                ref={messagesRef}
                className={
                  styles.messages
                }
                aria-live="polite"
                aria-label={
                  `Conversation with ${otherPerson.full_name}`
                }
              >
                {thread.has_more ? (
                  <button
                    type="button"
                    className={
                      styles.loadOlder
                    }
                    disabled={
                      loadingOlder
                    }
                    onClick={() => {
                      void loadOlder();
                    }}
                  >
                    {loadingOlder ? (
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

                    {loadingOlder
                      ? "Loading…"
                      : "Load older messages"}
                  </button>
                ) : (
                  <div
                    className={
                      styles.threadStart
                    }
                  >
                    Conversation started
                  </div>
                )}

                {thread.messages.map(
                  (
                    message:
                      InquiryMessage,
                  ) => {
                    const mine =
                      message.sender_id ===
                      user?.id;

                    return (
                      <div
                        key={
                          message.id
                        }
                        className={[
                          styles.messageRow,

                          mine
                            ? styles.myMessageRow
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div
                          className={[
                            styles.messageBubble,

                            mine
                              ? styles.myMessage
                              : styles.theirMessage,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <p>
                            {
                              message.message
                            }
                          </p>

                          <time
                            dateTime={
                              message.created_at
                            }
                          >
                            {formatMessageTime(
                              message.created_at,
                            )}
                          </time>
                        </div>
                      </div>
                    );
                  },
                )}

                {thread.status ===
                "closed" ? (
                  <div
                    className={
                      styles.closedNotice
                    }
                  >
                    This conversation has
                    been closed.
                  </div>
                ) : null}
              </div>


              <div
                className={
                  styles.composerArea
                }
              >
                {thread.status ===
                "closed" ? (
                  <div
                    className={
                      styles.disabledComposer
                    }
                  >
                    This conversation is
                    closed.
                  </div>
                ) : (
                  <form
                    className={
                      styles.composer
                    }
                    onSubmit={
                      (event) => {
                        event.preventDefault();

                        void sendMessage();
                      }
                    }
                  >
                    <label
                      htmlFor={
                        "inquiry-message"
                      }
                      className={
                        styles.srOnly
                      }
                    >
                      Message{" "}
                      {
                        otherPerson
                          .full_name
                      }
                    </label>

                    <textarea
                      id="inquiry-message"
                      value={composer}
                      onChange={
                        (event) => {
                          setComposer(
                            event.target
                              .value,
                          );
                        }
                      }
                      placeholder={
                        `Message ${otherPerson.full_name}…`
                      }
                      maxLength={3000}
                      rows={1}
                      disabled={
                        sending ||
                        closing
                      }
                      onKeyDown={
                        (event) => {
                          if (
                            event.key ===
                              "Enter" &&
                            !event.shiftKey &&
                            !event.nativeEvent
                              .isComposing
                          ) {
                            event.preventDefault();

                            void sendMessage();
                          }
                        }
                      }
                    />

                    <button
                      type="submit"
                      disabled={
                        sending ||
                        closing ||
                        !composer.trim()
                      }
                      aria-label={
                        sending
                          ? "Sending message"
                          : "Send message"
                      }
                    >
                      {sending ? (
                        <Loader2
                          aria-hidden="true"
                          className={
                            styles.spin
                          }
                        />
                      ) : (
                        <Send
                          aria-hidden="true"
                        />
                      )}

                      <span>
                        {sending
                          ? "Sending…"
                          : "Send"}
                      </span>
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}