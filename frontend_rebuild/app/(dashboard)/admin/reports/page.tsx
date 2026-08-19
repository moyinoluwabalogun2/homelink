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
  CalendarDays,
  CheckCircle2,
  Eye,
  Flag,
  MapPin,
  RefreshCw,
  SearchCheck,
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";

import DecisionDialog from "@/components/admin/DecisionDialog";
import shared from "@/components/dashboard/DashboardPage.module.css";
import StatusBadge from "@/components/dashboard/StatusBadge";

import { getApiErrorMessage } from "@/lib/api-errors";

import {
  formatDate,
  titleCase,
} from "@/lib/formatters";

import { adminService } from "@/services/admin-service";

import type {
  ListingReport,
  ReportStatus,
} from "@/types/admin";

import styles from "./page.module.css";


type ReportFilter =
  | "all"
  | ReportStatus;


interface ReportDecision {
  report: ListingReport;
  status: ReportStatus;
}


const filters: ReportFilter[] = [
  "open",
  "in_review",
  "resolved",
  "dismissed",
  "all",
];


export default function AdminReportsPage() {
  const [filter, setFilter] =
    useState<ReportFilter>("open");

  const [items, setItems] =
    useState<ListingReport[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [decision, setDecision] =
    useState<ReportDecision | null>(null);

  const [error, setError] =
    useState("");


  /*
   * Cache already-loaded tabs.
   *
   * This prevents repeat GET requests when an admin moves
   * between Open -> In review -> Open during the same visit.
   */
  const cacheRef =
    useRef(
      new Map<
        ReportFilter,
        ListingReport[]
      >(),
    );

  /*
   * Prevent an older request from overwriting a newer tab
   * if the admin switches filters quickly.
   */
  const requestIdRef =
    useRef(0);


  /* =========================================================
     LOAD
  ========================================================= */

  const load = useCallback(
    async (
      force = false,
    ) => {
      const requestId =
        ++requestIdRef.current;

      setError("");

      if (!force) {
        const cached =
          cacheRef.current.get(
            filter,
          );

        if (cached) {
          setItems(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true);

      try {
        const reports =
          await adminService.listReports(
            filter === "all"
              ? undefined
              : filter,
          );

        if (
          requestId !==
          requestIdRef.current
        ) {
          return;
        }

        cacheRef.current.set(
          filter,
          reports,
        );

        setItems(reports);
      } catch (reason) {
        if (
          requestId !==
          requestIdRef.current
        ) {
          return;
        }

        setError(
          getApiErrorMessage(
            reason,
            "Reports could not be loaded.",
          ),
        );
      } finally {
        if (
          requestId ===
          requestIdRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [filter],
  );


  useEffect(() => {
    void load();
  }, [load]);


  /* =========================================================
     DIALOG COPY
  ========================================================= */

  const dialogCopy =
    useMemo(() => {
      if (!decision) {
        return null;
      }

      if (
        decision.status ===
        "in_review"
      ) {
        return {
          title:
            "Move report into review?",

          description:
            "Record why this report requires further investigation before a final moderation decision.",

          confirmLabel:
            "Start review",

          tone:
            "primary" as const,
        };
      }

      if (
        decision.status ===
        "dismissed"
      ) {
        return {
          title:
            "Dismiss this report?",

          description:
            "Explain why the report does not require further moderation action.",

          confirmLabel:
            "Dismiss report",

          tone:
            "danger" as const,
        };
      }

      return {
        title:
          "Resolve this report?",

        description:
          "Record the final moderation outcome and any action taken on the listing or account.",

        confirmLabel:
          "Resolve report",

        tone:
          "primary" as const,
      };
    }, [decision]);


  /* =========================================================
     SAVE DECISION
  ========================================================= */

  const saveDecision =
    async (
      note: string,
    ) => {
      if (
        !decision ||
        workingId
      ) {
        return;
      }

      const reportId =
        decision.report.id;

      const nextStatus =
        decision.status;

      setWorkingId(
        reportId,
      );

      try {
        const updated =
          await adminService.resolveReport(
            reportId,
            nextStatus,
            note,
          );

        setItems(
          (current) => {
            const nextItems =
              filter === "all" ||
              updated.status === filter
                ? current.map(
                    (item) =>
                      item.id ===
                      updated.id
                        ? updated
                        : item,
                  )
                : current.filter(
                    (item) =>
                      item.id !==
                      updated.id,
                  );

            /*
             * Other report tabs may now be stale because the
             * report changed status. Clear them, but preserve
             * the current already-updated view.
             */
            cacheRef.current.clear();

            cacheRef.current.set(
              filter,
              nextItems,
            );

            return nextItems;
          },
        );

        toast.success(
          `Report marked as ${titleCase(
            nextStatus,
          )}.`,
        );

        setDecision(null);
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
          ),
        );
      } finally {
        setWorkingId(null);
      }
    };


  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className={shared.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <Flag aria-hidden="true" />
            Safety moderation
          </span>

          <h1>
            Investigate listing reports.
          </h1>

          <p>
            Review suspicious, misleading,
            duplicated or unavailable
            listings and leave a clear
            moderation record for every
            decision.
          </p>
        </div>


        <div className={styles.headerTools}>
          <div className={styles.queueCount}>
            <span>
              {filter === "all"
                ? "Showing"
                : titleCase(filter)}
            </span>

            <strong>
              {loading
                ? "—"
                : items.length}
            </strong>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            disabled={loading}
            onClick={() => {
              void load(true);
            }}
          >
            <RefreshCw aria-hidden="true" />
            Refresh
          </button>
        </div>
      </header>


      {/* =====================================================
          FILTERS
      ====================================================== */}

      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Report status"
      >
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={
              filter === item
            }
            className={
              filter === item
                ? styles.activeTab
                : ""
            }
            onClick={() => {
              setFilter(item);
            }}
          >
            {titleCase(item)}
          </button>
        ))}
      </div>


      <div className={styles.guidance}>
        <ShieldAlert aria-hidden="true" />

        <div>
          <strong>
            Review the evidence first.
          </strong>

          <span>
            A report is a moderation
            signal, not proof by itself.
            Check the listing and record
            what was reviewed before
            resolving or dismissing it.
          </span>
        </div>
      </div>


      {error ? (
        <div className={shared.error}>
          {error}
        </div>
      ) : null}


      {/* =====================================================
          LOADING
      ====================================================== */}

      {loading ? (
        <div className={styles.reportList}>
          {Array.from(
            { length: 3 },
            (_, index) => (
              <div
                key={index}
                className={styles.skeleton}
              />
            ),
          )}
        </div>
      ) : null}


      {/* =====================================================
          EMPTY
      ====================================================== */}

      {!loading &&
      items.length === 0 ? (
        <section className={styles.empty}>
          <span>
            <Flag aria-hidden="true" />
          </span>

          <h2>
            No{" "}
            {filter === "all"
              ? ""
              : `${titleCase(filter)} `}
            reports.
          </h2>

          <p>
            Reports matching this status
            will appear here.
          </p>
        </section>
      ) : null}


      {/* =====================================================
          REPORTS
      ====================================================== */}

      {!loading &&
      items.length > 0 ? (
        <div className={styles.reportList}>
          {items.map(
            (report, index) => {
              const busy =
                workingId ===
                report.id;

              return (
                <article
                  key={report.id}
                  className={styles.reportCard}
                >
                  <div className={styles.reportIndex}>
                    {String(
                      index + 1,
                    ).padStart(
                      2,
                      "0",
                    )}
                  </div>


                  <div className={styles.reportBody}>
                    <div className={styles.cardHeader}>
                      <div>
                        <span className={styles.reasonLabel}>
                          {titleCase(
                            report.reason,
                          )}
                        </span>

                        <h2>
                          {report.listing.title}
                        </h2>
                      </div>

                      <StatusBadge
                        status={report.status}
                      />
                    </div>


                    <div className={styles.reportMeta}>
                      <span>
                        <UserRound aria-hidden="true" />

                        Reported by{" "}
                        {report.reporter.full_name}
                      </span>

                      <span>
                        <CalendarDays aria-hidden="true" />

                        {formatDate(
                          report.created_at,
                        )}
                      </span>

                      <span>
                        <MapPin aria-hidden="true" />

                        {report.listing.area.name}
                      </span>
                    </div>


                    <div className={styles.reasonBox}>
                      <ShieldAlert aria-hidden="true" />

                      <div>
                        <strong>
                          Report details
                        </strong>

                        <p>
                          {report.details ||
                            "No additional details were provided."}
                        </p>
                      </div>
                    </div>


                    <div className={styles.listingFacts}>
                      <div>
                        <span>
                          Listing type
                        </span>

                        <strong>
                          {titleCase(
                            report.listing
                              .listing_type,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Listing status
                        </span>

                        <strong>
                          {titleCase(
                            report.listing.status,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Report status
                        </span>

                        <strong>
                          {titleCase(
                            report.status,
                          )}
                        </strong>
                      </div>
                    </div>


                    {report.resolution_note ? (
                      <div className={styles.resolution}>
                        <CheckCircle2 aria-hidden="true" />

                        <div>
                          <strong>
                            Resolution note
                          </strong>

                          <p>
                            {
                              report.resolution_note
                            }
                          </p>
                        </div>
                      </div>
                    ) : null}


                    <div className={styles.actions}>
                      <Link
                        href={`/listings/${report.listing.id}`}
                        className={styles.viewButton}
                      >
                        <Eye aria-hidden="true" />
                        View listing
                      </Link>


                      {report.status === "open" ? (
                        <button
                          type="button"
                          className={styles.reviewButton}
                          disabled={
                            Boolean(workingId)
                          }
                          onClick={() => {
                            setDecision({
                              report,
                              status:
                                "in_review",
                            });
                          }}
                        >
                          <SearchCheck aria-hidden="true" />
                          Start review
                        </button>
                      ) : null}


                      {report.status !==
                      "resolved" ? (
                        <button
                          type="button"
                          className={styles.resolveButton}
                          disabled={
                            Boolean(workingId)
                          }
                          onClick={() => {
                            setDecision({
                              report,
                              status:
                                "resolved",
                            });
                          }}
                        >
                          <CheckCircle2 aria-hidden="true" />

                          {busy
                            ? "Working…"
                            : "Resolve"}
                        </button>
                      ) : null}


                      {report.status !==
                      "dismissed" ? (
                        <button
                          type="button"
                          className={styles.dismissButton}
                          disabled={
                            Boolean(workingId)
                          }
                          onClick={() => {
                            setDecision({
                              report,
                              status:
                                "dismissed",
                            });
                          }}
                        >
                          <XCircle aria-hidden="true" />
                          Dismiss
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>
      ) : null}


      <DecisionDialog
        open={
          Boolean(
            decision &&
            dialogCopy,
          )
        }
        title={
          dialogCopy?.title ??
          "Update report"
        }
        description={
          dialogCopy?.description ??
          "Record the moderation outcome."
        }
        confirmLabel={
          dialogCopy?.confirmLabel ??
          "Save decision"
        }
        placeholder="Add the evidence reviewed and the action taken…"
        minimumLength={5}
        tone={
          dialogCopy?.tone ??
          "primary"
        }
        submitting={
          Boolean(
            decision &&
            workingId ===
              decision.report.id,
          )
        }
        onCancel={() => {
          setDecision(null);
        }}
        onConfirm={saveDecision}
      />
    </div>
  );
}