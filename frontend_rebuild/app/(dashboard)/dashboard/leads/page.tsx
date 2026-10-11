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
  CheckCircle2,
  Eye,
  Inbox,
  Loader2,
  MessageSquare,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import {
  toast,
} from "sonner";

import shared from "@/components/dashboard/DashboardPage.module.css";
import StatusBadge from "@/components/dashboard/StatusBadge";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatDate,
  titleCase,
} from "@/lib/formatters";

import {
  engagementService,
} from "@/services/engagement-service";

import type {
  Inquiry,
  InquiryStatus,
} from "@/types/engagement";

import styles from "./page.module.css";


type LeadFilter =
  | "all"
  | InquiryStatus;


const leadFilters:
  LeadFilter[] = [
    "open",
    "responded",
    "closed",
    "all",
  ];


export default function LeadsPage() {
  const [
    items,
    setItems,
  ] = useState<Inquiry[]>([]);

  const [
    filter,
    setFilter,
  ] = useState<LeadFilter>(
    "open",
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    workingId,
    setWorkingId,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const requestVersionRef =
    useRef(0);


  /* =========================================================
     LOAD LEADS
  ========================================================= */

  const loadLeads =
    useCallback(
      async () => {
        const requestVersion =
          ++requestVersionRef.current;

        setLoading(true);
        setError("");

        try {
          const records =
            await engagementService
              .listReceivedInquiries();

          if (
            requestVersion !==
            requestVersionRef.current
          ) {
            return;
          }

          setItems(records);
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
              "Incoming leads could not be loaded.",
            ),
          );
        } finally {
          if (
            requestVersion ===
            requestVersionRef.current
          ) {
            setLoading(false);
          }
        }
      },
      [],
    );


  useEffect(() => {
    void loadLeads();

    return () => {
      requestVersionRef.current += 1;
    };
  }, [
    loadLeads,
  ]);


  /* =========================================================
     FILTERS AND COUNTS
  ========================================================= */

  const counts =
    useMemo<
      Record<
        LeadFilter,
        number
      >
    >(
      () => ({
        all:
          items.length,

        open:
          items.filter(
            (item) =>
              item.status ===
              "open",
          ).length,

        responded:
          items.filter(
            (item) =>
              item.status ===
              "responded",
          ).length,

        closed:
          items.filter(
            (item) =>
              item.status ===
              "closed",
          ).length,
      }),
      [
        items,
      ],
    );


  const visible =
    useMemo(
      () =>
        filter === "all"
          ? items
          : items.filter(
              (item) =>
                item.status ===
                filter,
            ),
      [
        filter,
        items,
      ],
    );


  /* =========================================================
     UPDATE LEAD STATUS
  ========================================================= */

  const update =
    async (
      inquiry: Inquiry,
      status: InquiryStatus,
    ) => {
      if (
        workingId !== null
      ) {
        return;
      }

      setWorkingId(
        inquiry.id,
      );

      try {
        const updated =
          await engagementService
            .updateInquiryStatus(
              inquiry.id,
              status,
            );

        setItems(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                updated.id
                  ? updated
                  : item,
            ),
        );

        toast.success(
          status === "closed"
            ? "Lead closed."
            : status === "open"
              ? "Lead reopened."
              : "Lead marked as responded.",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Lead status could not be updated.",
          ),
        );
      } finally {
        setWorkingId(null);
      }
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
            <Inbox
              aria-hidden="true"
            />

            Lead management
          </span>

          <h1>
            Incoming property
            inquiries.
          </h1>

          <p>
            Review questions and
            inspection requests, then
            keep each lead status current
            so nothing important gets
            lost.
          </p>
        </div>

        {!loading &&
        !error ? (
          <div
            className={
              styles.headerSummary
            }
            aria-live="polite"
          >
            <strong>
              {items.length}
            </strong>

            <span>
              {items.length === 1
                ? "total lead"
                : "total leads"}
            </span>
          </div>
        ) : null}
      </header>


      {/* =====================================================
          FILTERS
      ====================================================== */}

      <div
        className={shared.tabs}
        role="group"
        aria-label={
          "Filter leads by status"
        }
      >
        {leadFilters.map(
          (status) => {
            const active =
              filter === status;

            return (
              <button
                key={status}
                type="button"
                className={
                  active
                    ? shared.activeTab
                    : undefined
                }
                aria-pressed={active}
                onClick={() => {
                  setFilter(status);
                }}
              >
                <span>
                  {titleCase(status)}
                </span>

                <b>
                  {counts[status]}
                </b>
              </button>
            );
          },
        )}
      </div>


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
              void loadLeads();
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
              ? "Retrying…"
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
            "Loading incoming leads"
          }
        >
          <span
            className={
              styles.srOnly
            }
          >
            Loading incoming leads…
          </span>

          {Array.from(
            {
              length: 4,
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
                <span />
                <span />
                <span />
                <span />
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
      visible.length === 0 ? (
        <section
          className={shared.empty}
          aria-labelledby={
            "leads-empty-title"
          }
        >
          <span
            className={
              shared.emptyIcon
            }
          >
            <Inbox
              aria-hidden="true"
            />
          </span>

          <h2
            id="leads-empty-title"
          >
            No{" "}
            {filter === "all"
              ? ""
              : `${filter} `}
            leads
          </h2>

          <p>
            {items.length === 0
              ? "New questions and inspection requests for your listings will appear here."
              : "No leads currently match this status. Choose another filter to see the rest."}
          </p>

          {items.length > 0 &&
          filter !== "all" ? (
            <button
              type="button"
              className={
                shared.secondaryButton
              }
              onClick={() => {
                setFilter("all");
              }}
            >
              Show all leads
            </button>
          ) : null}
        </section>
      ) : null}


      {/* =====================================================
          LEAD LIST
      ====================================================== */}

      {!loading &&
      !error &&
      visible.length > 0 ? (
        <div
          className={styles.list}
          role="list"
          aria-label={
            filter === "all"
              ? "All incoming leads"
              : `${titleCase(filter)} incoming leads`
          }
        >
          {visible.map(
            (inquiry) => {
              const working =
                workingId ===
                inquiry.id;

              return (
                <article
                  key={inquiry.id}
                  className={
                    styles.card
                  }
                  role="listitem"
                  aria-busy={working}
                >
                  <div
                    className={
                      styles.cardHeader
                    }
                  >
                    <div>
                      <span>
                        {titleCase(
                          inquiry.inquiry_type,
                        )}
                      </span>

                      <h2>
                        {
                          inquiry.listing
                            .title
                        }
                      </h2>
                    </div>

                    <StatusBadge
                      status={
                        inquiry.status
                      }
                    />
                  </div>

                  <blockquote>
                    {inquiry.message}
                  </blockquote>

                  <div
                    className={
                      styles.senderRow
                    }
                  >
                    <div>
                      <strong>
                        {
                          inquiry.sender
                            .full_name
                        }
                      </strong>

                      <span>
                        Received{" "}
                        {formatDate(
                          inquiry.created_at,
                        )}
                      </span>
                    </div>

                    <div
                      className={
                        styles.contextLinks
                      }
                    >
                      <Link
                        href={
                          `/dashboard/inquiries?thread=${encodeURIComponent(
                            inquiry.id,
                          )}`
                        }
                      >
                        <MessageSquare
                          aria-hidden="true"
                        />

                        Open conversation
                      </Link>

                      <Link
                        href={
                          `/listings/${inquiry.listing.id}`
                        }
                      >
                        <Eye
                          aria-hidden="true"
                        />

                        View listing
                      </Link>
                    </div>
                  </div>

                  <div
                    className={
                      styles.actions
                    }
                  >
                    {working ? (
                      <span
                        className={
                          styles.working
                        }
                        role="status"
                      >
                        <Loader2
                          aria-hidden="true"
                          className={
                            styles.spin
                          }
                        />

                        Updating lead…
                      </span>
                    ) : null}

                    {inquiry.status ===
                    "open" ? (
                      <button
                        type="button"
                        className={
                          styles.respondAction
                        }
                        disabled={
                          workingId !==
                          null
                        }
                        onClick={() => {
                          void update(
                            inquiry,
                            "responded",
                          );
                        }}
                      >
                        <MessageSquare
                          aria-hidden="true"
                        />

                        Mark responded
                      </button>
                    ) : null}

                    {inquiry.status !==
                    "closed" ? (
                      <button
                        type="button"
                        className={
                          styles.closeAction
                        }
                        disabled={
                          workingId !==
                          null
                        }
                        onClick={() => {
                          void update(
                            inquiry,
                            "closed",
                          );
                        }}
                      >
                        <CheckCircle2
                          aria-hidden="true"
                        />

                        Close lead
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={
                          styles.reopenAction
                        }
                        disabled={
                          workingId !==
                          null
                        }
                        onClick={() => {
                          void update(
                            inquiry,
                            "open",
                          );
                        }}
                      >
                        <RotateCcw
                          aria-hidden="true"
                        />

                        Reopen lead
                      </button>
                    )}
                  </div>
                </article>
              );
            },
          )}
        </div>
      ) : null}
    </div>
  );
}