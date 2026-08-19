"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";

import { engagementService } from "@/services/engagement-service";

import {
  isMessageCreatedEvent,
  liveEventsService,
} from "@/services/live-events-service";

import { getApiErrorMessage } from "@/lib/api-errors";

import { titleCase } from "@/lib/formatters";

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
        part[0]?.toUpperCase() ?? "",
    )
    .join("");
}


function formatConversationTime(
  value: string,
): string {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const today = new Date();

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
  const date = new Date(value);

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
  type: ConversationListingType;
}) {
  if (
    type === "marketplace"
  ) {
    return (
      <Store aria-hidden="true" />
    );
  }

  if (
    type === "buy_property"
  ) {
    return (
      <Building2 aria-hidden="true" />
    );
  }

  return (
    <Home aria-hidden="true" />
  );
}


export default function InquiriesPage() {
  const { user } = useAuth();

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
  ] =
    useState<
      InquiryInboxItem[]
    >([]);


  const inboxRef =
    useRef<
      InquiryInboxItem[]
    >([]);


  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(
      requestedThread,
    );


  const selectedIdRef =
    useRef<string | null>(
      requestedThread,
    );


  const [
    mobileThreadOpen,
    setMobileThreadOpen,
  ] =
    useState(
      Boolean(
        requestedThread,
      ),
    );


  const [
    thread,
    setThread,
  ] =
    useState<
      InquiryThread | null
    >(null);


  const [
    loadingInbox,
    setLoadingInbox,
  ] =
    useState(true);


  const [
    loadingThread,
    setLoadingThread,
  ] =
    useState(false);


  const [
    loadingOlder,
    setLoadingOlder,
  ] =
    useState(false);


  const [
    sending,
    setSending,
  ] =
    useState(false);


  const [
    closing,
    setClosing,
  ] =
    useState(false);


  const [
    composer,
    setComposer,
  ] =
    useState("");


  const [
    error,
    setError,
  ] =
    useState("");


  const readTimerRef =
  useRef<number | null>(
    null,
  );


  /* =========================================================
     REFS
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
     DEEP LINK
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
      async () => {
        setLoadingInbox(
          true,
        );

        setError("");

        try {
          const items =
            await engagementService.listInbox();

          setInbox(
            items,
          );

          if (
            !requestedThread &&
            !selectedIdRef.current &&
            items.length > 0
          ) {
            setSelectedId(
              items[0].id,
            );
          }
        } catch (
          reason
        ) {
          setError(
            getApiErrorMessage(
              reason,
              "Messages could not be loaded.",
            ),
          );
        } finally {
          setLoadingInbox(
            false,
          );
        }
      },
      [
        requestedThread,
      ],
    );


  useEffect(() => {
    void loadInbox();
  }, [
    loadInbox,
  ]);


  /* =========================================================
     LOAD SELECTED THREAD
  ========================================================= */

  useEffect(() => {
    if (
      !selectedId
    ) {
      setThread(
        null,
      );

      return;
    }

    let active =
      true;

    const load =
      async () => {
        setLoadingThread(
          true,
        );

        try {
          const result =
            await engagementService.getInquiryThread(
              selectedId,
            );

          if (
            !active
          ) {
            return;
          }

          setThread(
            result,
          );

          const inboxItem =
            inboxRef.current.find(
              (item) =>
                item.id ===
                selectedId,
            );

          if (
            inboxItem?.unread
          ) {
            engagementService
              .markInquiryRead(
                selectedId,
              )
              .then(() => {
                if (
                  !active
                ) {
                  return;
                }

                setInbox(
                  (
                    current,
                  ) =>
                    current.map(
                      (
                        item,
                      ) =>
                        item.id ===
                        selectedId
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
                        inquiryId:
                          selectedId,
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
        } catch (
          reason
        ) {
          if (
            active
          ) {
            toast.error(
              getApiErrorMessage(
                reason,
                "Conversation could not be opened.",
              ),
            );
          }
        } finally {
          if (
            active
          ) {
            setLoadingThread(
              false,
            );
          }
        }
      };

    void load();

    return () => {
      active =
        false;
    };
  }, [
    selectedId,
  ]);


  /* =========================================================
     LIVE MESSAGE DELIVERY
  ========================================================= */

  useEffect(() => {
    const unsubscribe =
      liveEventsService.subscribe(
        (
          event,
        ) => {
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
              (
                item,
              ) =>
                item.id ===
                inquiryId,
            );


          /*
           * Update existing inbox row locally.
           * No refetch needed for normal replies.
           */
          if (
            existsInInbox
          ) {
            setInbox(
              (
                current,
              ) => {
                const updated =
                  current.map(
                    (
                      item,
                    ) =>
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
                  );

                return [
                  ...updated,
                ].sort(
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
              },
            );
          } else {
            /*
             * Rare case: the conversation was not in the
             * currently loaded inbox page.
             *
             * This request happens only because a real event
             * arrived. It is not polling.
             */
            void loadInbox();
          }


          /*
           * If this exact conversation is open, append the
           * message instantly.
           */
          if (
            currentlySelected
          ) {
            setThread(
              (
                current,
              ) => {
                if (
                  !current ||
                  current.id !==
                    inquiryId
                ) {
                  return current;
                }

                const duplicate =
                  current.messages.some(
                    (
                      existing,
                    ) =>
                      existing.id ===
                      message.id,
                  );

                if (
                  duplicate
                ) {
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


          /*
           * If the user is literally viewing this chat,
           * advance the read cursor.
           *
           * A short debounce collapses a burst of incoming
           * messages into one PATCH instead of one PATCH
           * per message.
           */
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


          /*
           * User is elsewhere / tab hidden:
           * small toast, no DB query.
           */
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

      setSending(
        true,
      );

      try {
        const message =
          await engagementService.sendInquiryMessage(
            thread.id,
            text,
          );

        const ownerIsReplying =
          user?.id ===
            thread.recipient.id &&
          thread.status ===
            "open";

        setThread(
          (
            current,
          ) => {
            if (
              !current
            ) {
              return current;
            }

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
              messages: [
                ...current.messages,
                message,
              ],
            };
          },
        );

        setInbox(
          (
            current,
          ) => {
            const updated =
              current.map(
                (
                  item,
                ) =>
                  item.id ===
                  thread.id
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
                        unread:
                          false,
                      }
                    : item,
              );

            return [
              ...updated,
            ].sort(
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
          },
        );

        setComposer("");
      } catch (
        reason
      ) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Message could not be sent.",
          ),
        );
      } finally {
        setSending(
          false,
        );
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

      setLoadingOlder(
        true,
      );

      try {
        const older =
          await engagementService.getInquiryThread(
            thread.id,
            {
              before:
                thread.next_before,
            },
          );

        setThread(
          (
            current,
          ) => {
            if (
              !current
            ) {
              return current;
            }

            const existing =
              new Set(
                current.messages.map(
                  (
                    message,
                  ) =>
                    message.id,
                ),
              );

            const prepend =
              older.messages.filter(
                (
                  message,
                ) =>
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
      } catch (
        reason
      ) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Older messages could not be loaded.",
          ),
        );
      } finally {
        setLoadingOlder(
          false,
        );
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
        thread.status ===
          "closed"
      ) {
        return;
      }

      setClosing(
        true,
      );

      try {
        const updated =
          await engagementService.updateInquiryStatus(
            thread.id,
            "closed",
          );

        setThread(
          (
            current,
          ) =>
            current
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
          (
            current,
          ) =>
            current.map(
              (
                item,
              ) =>
                item.id ===
                thread.id
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
      } catch (
        reason
      ) {
        toast.error(
          getApiErrorMessage(
            reason,
          ),
        );
      } finally {
        setClosing(
          false,
        );
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
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>
            <MessageSquare aria-hidden="true" />
            HomeLink messages
          </span>

          <h1>Messages.</h1>

          <p>
            Talk directly with buyers,
            renters and listing owners
            without leaving HomeLink.
          </p>
        </div>

        <div className={styles.headerMeta}>
          <span>
            {inbox.length}{" "}
            {inbox.length === 1
              ? "conversation"
              : "conversations"}
          </span>

          {unreadCount > 0 ? (
            <strong>
              {unreadCount} unread
            </strong>
          ) : (
            <strong>
              All caught up
            </strong>
          )}
        </div>
      </header>


      {error ? (
        <div className={styles.error}>
          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              void loadInbox()
            }
          >
            <RefreshCw aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : null}


      <section
        className={`${styles.messagingShell} ${
          mobileThreadOpen
            ? styles.mobileThreadVisible
            : ""
        }`}
      >
        <aside className={styles.inboxPane}>
          <div className={styles.inboxHeader}>
            <div>
              <Inbox aria-hidden="true" />
              <strong>Conversations</strong>
            </div>

            {unreadCount > 0 ? (
              <span>{unreadCount}</span>
            ) : null}
          </div>


          <div className={styles.conversationList}>
            {loadingInbox
              ? Array.from(
                  { length: 5 },
                  (_, index) => (
                    <div
                      key={index}
                      className={
                        styles.conversationSkeleton
                      }
                    />
                  ),
                )
              : null}


            {!loadingInbox &&
            inbox.length === 0 ? (
              <div className={styles.emptyInbox}>
                <span>
                  <MessageSquare aria-hidden="true" />
                </span>

                <strong>
                  No messages yet
                </strong>

                <p>
                  Contact someone from a listing
                  and your conversation will
                  appear here.
                </p>
              </div>
            ) : null}


            {!loadingInbox
              ? inbox.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.conversationItem} ${
                      selectedId === item.id
                        ? styles.activeConversation
                        : ""
                    } ${
                      item.unread
                        ? styles.unreadConversation
                        : ""
                    }`}
                    onClick={() =>
                      openConversation(
                        item.id,
                      )
                    }
                  >
                    <span className={styles.avatar}>
                      {item.other_user.profile_image_url ? (
                        <img
                          src={
                            item.other_user.profile_image_url
                          }
                          alt=""
                        />
                      ) : (
                        initials(
                          item.other_user.full_name,
                        )
                      )}
                    </span>

                    <span className={styles.conversationCopy}>
                      <span className={styles.conversationTop}>
                        <strong>
                          {item.other_user.full_name}
                        </strong>

                        <time>
                          {formatConversationTime(
                            item.last_message_at,
                          )}
                        </time>
                      </span>

                      <span className={styles.listingLabel}>
                        <ListingIcon
                          type={
                            item.listing.listing_type
                          }
                        />

                        {item.listing.title}
                      </span>

                      <span className={styles.previewRow}>
                        <span className={styles.preview}>
                          {item.last_message_sender_id ===
                          user?.id
                            ? "You: "
                            : ""}

                          {item.last_message_preview}
                        </span>

                        {item.unread ? (
                          <b aria-label="Unread conversation" />
                        ) : null}
                      </span>
                    </span>

                    <ChevronRight
                      aria-hidden="true"
                      className={styles.rowArrow}
                    />
                  </button>
                ))
              : null}
          </div>
        </aside>


        <div className={styles.threadPane}>
          {!selectedId ? (
            <div className={styles.noThread}>
              <span>
                <MessageSquare aria-hidden="true" />
              </span>

              <h2>Select a conversation</h2>
              <p>Your messages will appear here.</p>
            </div>
          ) : null}


          {selectedId &&
          loadingThread ? (
            <div className={styles.threadLoading}>
              <Loader2 aria-hidden="true" />
              Loading conversation…
            </div>
          ) : null}


          {selectedId &&
          !loadingThread &&
          thread &&
          otherPerson ? (
            <>
              <div className={styles.threadHeader}>
                <button
                  type="button"
                  className={styles.mobileBack}
                  onClick={backToInbox}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft aria-hidden="true" />
                </button>

                <span className={styles.headerAvatar}>
                  {otherPerson.profile_image_url ? (
                    <img
                      src={otherPerson.profile_image_url}
                      alt=""
                    />
                  ) : (
                    initials(
                      otherPerson.full_name,
                    )
                  )}
                </span>

                <div className={styles.threadIdentity}>
                  <strong>
                    {otherPerson.full_name}
                  </strong>

                  <span>
                    {titleCase(
                      otherPerson.role,
                    )}
                  </span>
                </div>

                <div className={styles.threadActions}>
                  <span
                    className={`${styles.status} ${
                      thread.status === "closed"
                        ? styles.closedStatus
                        : ""
                    }`}
                  >
                    {titleCase(thread.status)}
                  </span>

                  {thread.status !== "closed" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void closeConversation()
                      }
                      disabled={closing}
                    >
                      <X aria-hidden="true" />
                      {closing
                        ? "Closing…"
                        : "Close"}
                    </button>
                  ) : null}
                </div>
              </div>


              <Link
                href={`/listings/${thread.listing.id}`}
                className={styles.listingContext}
              >
                <span>
                  <ListingIcon
                    type={
                      thread.listing.listing_type
                    }
                  />
                </span>

                <div>
                  <small>
                    {titleCase(
                      thread.listing.listing_type,
                    )}
                  </small>

                  <strong>
                    {thread.listing.title}
                  </strong>
                </div>

                <ChevronRight aria-hidden="true" />
              </Link>


              <div className={styles.messages}>
                {thread.has_more ? (
                  <button
                    type="button"
                    className={styles.loadOlder}
                    disabled={loadingOlder}
                    onClick={() =>
                      void loadOlder()
                    }
                  >
                    {loadingOlder ? (
                      <Loader2 aria-hidden="true" />
                    ) : null}

                    {loadingOlder
                      ? "Loading…"
                      : "Load older messages"}
                  </button>
                ) : (
                  <div className={styles.threadStart}>
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
                        key={message.id}
                        className={`${styles.messageRow} ${
                          mine
                            ? styles.myMessageRow
                            : ""
                        }`}
                      >
                        <div
                          className={`${styles.messageBubble} ${
                            mine
                              ? styles.myMessage
                              : styles.theirMessage
                          }`}
                        >
                          <p>{message.message}</p>

                          <time>
                            {formatMessageTime(
                              message.created_at,
                            )}
                          </time>
                        </div>
                      </div>
                    );
                  },
                )}


                {thread.status === "closed" ? (
                  <div className={styles.closedNotice}>
                    This conversation has been closed.
                  </div>
                ) : null}
              </div>


              <div className={styles.composerArea}>
                {thread.status === "closed" ? (
                  <div className={styles.disabledComposer}>
                    This conversation is closed.
                  </div>
                ) : (
                  <form
                    className={styles.composer}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void sendMessage();
                    }}
                  >
                    <textarea
                      value={composer}
                      onChange={(event) =>
                        setComposer(
                          event.target.value,
                        )
                      }
                      placeholder={`Message ${otherPerson.full_name}…`}
                      maxLength={3000}
                      rows={1}
                      disabled={sending}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />

                    <button
                      type="submit"
                      disabled={
                        sending ||
                        !composer.trim()
                      }
                      aria-label="Send message"
                    >
                      {sending ? (
                        <Loader2 aria-hidden="true" />
                      ) : (
                        <Send aria-hidden="true" />
                      )}

                      <span>Send</span>
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