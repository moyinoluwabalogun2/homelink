"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Activity,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  Fingerprint,
  Globe2,
  RefreshCw,
  Search,
} from "lucide-react";

import shared from "@/components/dashboard/DashboardPage.module.css";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatDate,
  titleCase,
} from "@/lib/formatters";

import {
  adminService,
} from "@/services/admin-service";

import type {
  AuditLog,
  AuditLogFilters,
} from "@/types/admin";

import styles from "./page.module.css";


export default function AdminAuditPage() {
  const [
    items,
    setItems,
  ] =
    useState<AuditLog[]>([]);

  const [
    action,
    setAction,
  ] =
    useState("");

  const [
    actorId,
    setActorId,
  ] =
    useState("");

  const [
    createdFrom,
    setCreatedFrom,
  ] =
    useState("");

  const [
    createdTo,
    setCreatedTo,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    expandedId,
    setExpandedId,
  ] =
    useState<string | null>(
      null,
    );


  /*
   * Protect against an older request finishing after a newer one.
   */
  const requestIdRef =
    useRef(0);


  /*
   * Refresh should repeat only the filters the admin actually
   * applied, not whatever happens to be half-typed in the form.
   */
  const appliedFiltersRef =
    useRef<AuditLogFilters>({
      limit: 100,
    });


  /* =========================================================
     LOAD
  ========================================================= */

  const load =
    useCallback(
      async (
        filters:
          AuditLogFilters,
      ) => {
        const requestId =
          ++requestIdRef.current;

        setLoading(
          true,
        );

        setError(
          "",
        );

        try {
          const logs =
            await adminService.listAuditLogs(
              filters,
            );

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          setItems(
            logs,
          );

          setExpandedId(
            null,
          );
        } catch (
          reason
        ) {
          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          setError(
            getApiErrorMessage(
              reason,
              "Audit logs could not be loaded.",
            ),
          );
        } finally {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [],
    );


  useEffect(() => {
    void load(
      appliedFiltersRef.current,
    );
  }, [
    load,
  ]);


  /* =========================================================
     FILTERS
  ========================================================= */

  const applyFilters =
    () => {
      const filters:
        AuditLogFilters = {
          action:
            action.trim()
            || undefined,

          actor_user_id:
            actorId.trim()
            || undefined,

          created_from:
            createdFrom
              ? new Date(
                  `${createdFrom}T00:00:00`,
                ).toISOString()
              : undefined,

          created_to:
            createdTo
              ? new Date(
                  `${createdTo}T23:59:59`,
                ).toISOString()
              : undefined,

          limit: 100,
        };

      appliedFiltersRef.current =
        filters;

      void load(
        filters,
      );
    };


  const clearFilters =
    () => {
      setAction("");
      setActorId("");
      setCreatedFrom("");
      setCreatedTo("");

      const filters:
        AuditLogFilters = {
          limit: 100,
        };

      appliedFiltersRef.current =
        filters;

      void load(
        filters,
      );
    };


  const hasDraftFilters =
    Boolean(
      action
      || actorId
      || createdFrom
      || createdTo,
    );


  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div
      className={
        shared.page
      }
    >
      <header
        className={
          styles.header
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            <Activity
              aria-hidden="true"
            />

            Accountability
          </span>

          <h1>
            Platform audit trail.
          </h1>

          <p>
            Inspect administrative
            decisions and important
            write activity using actors,
            targets, request identifiers
            and response status codes.
          </p>
        </div>


        <div
          className={
            styles.resultCount
          }
        >
          <span>
            Records
          </span>

          <strong>
            {loading
              ? "—"
              : items.length}
          </strong>
        </div>
      </header>


      {/* =====================================================
          FILTERS
      ====================================================== */}

      <section
        className={
          styles.toolbar
        }
      >
        <div
          className={
            styles.searchField
          }
        >
          <Search
            aria-hidden="true"
          />

          <input
            value={
              action
            }
            onChange={
              (event) => {
                setAction(
                  event.target.value,
                );
              }
            }
            onKeyDown={
              (event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  applyFilters();
                }
              }
            }
            placeholder="Action, e.g. admin.user"
            aria-label="Filter audit action"
          />
        </div>


        <div
          className={
            styles.actorField
          }
        >
          <Fingerprint
            aria-hidden="true"
          />

          <input
            value={
              actorId
            }
            onChange={
              (event) => {
                setActorId(
                  event.target.value,
                );
              }
            }
            onKeyDown={
              (event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  applyFilters();
                }
              }
            }
            placeholder="Actor user UUID"
            aria-label="Filter actor user ID"
          />
        </div>


        <label
          className={
            styles.dateField
          }
        >
          <span>
            From
          </span>

          <input
            type="date"
            value={
              createdFrom
            }
            onChange={
              (event) => {
                setCreatedFrom(
                  event.target.value,
                );
              }
            }
            aria-label="Created from"
          />
        </label>


        <label
          className={
            styles.dateField
          }
        >
          <span>
            To
          </span>

          <input
            type="date"
            value={
              createdTo
            }
            onChange={
              (event) => {
                setCreatedTo(
                  event.target.value,
                );
              }
            }
            aria-label="Created to"
          />
        </label>


        <button
          type="button"
          className={
            styles.applyButton
          }
          disabled={
            loading
          }
          onClick={
            applyFilters
          }
        >
          <Search
            aria-hidden="true"
          />

          Apply
        </button>


        <button
          type="button"
          className={
            styles.refreshButton
          }
          disabled={
            loading
          }
          onClick={
            () => {
              void load(
                appliedFiltersRef.current,
              );
            }
          }
        >
          <RefreshCw
            aria-hidden="true"
          />

          Refresh
        </button>
      </section>


      {hasDraftFilters ? (
        <button
          type="button"
          className={
            styles.clearButton
          }
          disabled={
            loading
          }
          onClick={
            clearFilters
          }
        >
          Clear filters
        </button>
      ) : null}


      <div
        className={
          styles.auditNotice
        }
      >
        <Activity
          aria-hidden="true"
        />

        <div>
          <strong>
            Audit records are evidence.
          </strong>

          <span>
            Use request IDs and event
            metadata to trace what
            happened before making
            conclusions about an account
            or administrative action.
          </span>
        </div>
      </div>


      {error ? (
        <div
          className={
            shared.error
          }
        >
          {error}
        </div>
      ) : null}


      {/* =====================================================
          LOADING
      ====================================================== */}

      {loading ? (
        <div
          className={
            styles.auditList
          }
        >
          {Array.from(
            {
              length: 5,
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


      {/* =====================================================
          EMPTY
      ====================================================== */}

      {!loading
      && items.length ===
        0 ? (
        <section
          className={
            styles.empty
          }
        >
          <span>
            <Activity
              aria-hidden="true"
            />
          </span>

          <h2>
            No matching audit records.
          </h2>

          <p>
            Change the filters or wait
            for new administrative write
            activity.
          </p>
        </section>
      ) : null}


      {/* =====================================================
          LOGS
      ====================================================== */}

      {!loading
      && items.length >
        0 ? (
        <>
          <div
            className={
              styles.auditList
            }
          >
            {items.map(
              (
                log,
                index,
              ) => {
                const expanded =
                  expandedId ===
                  log.id;

                const statusCode =
                  log.status_code;

                const isError =
                  (
                    statusCode
                    ?? 0
                  ) >= 400;

                return (
                  <article
                    key={
                      log.id
                    }
                    className={
                      styles.auditCard
                    }
                  >
                    <div
                      className={
                        styles.index
                      }
                    >
                      {String(
                        index + 1,
                      ).padStart(
                        2,
                        "0",
                      )}
                    </div>


                    <div
                      className={
                        styles.auditBody
                      }
                    >
                      <div
                        className={
                          styles.cardHeader
                        }
                      >
                        <div>
                          <span
                            className={
                              styles.actionLabel
                            }
                          >
                            Audit event
                          </span>

                          <h2>
                            {titleCase(
                              log.action,
                            )}
                          </h2>
                        </div>


                        <span
                          className={
                            styles.statusCode
                          }
                          data-error={
                            isError
                          }
                        >
                          {statusCode
                            ?? "—"}
                        </span>
                      </div>


                      <div
                        className={
                          styles.metaRow
                        }
                      >
                        <span>
                          <CalendarDays
                            aria-hidden="true"
                          />

                          {formatDate(
                            log.created_at,
                          )}
                        </span>

                        <span>
                          <CircleUserRound
                            aria-hidden="true"
                          />

                          {log.actor_user_id
                            ? "Authenticated actor"
                            : "Anonymous / system"}
                        </span>

                        <span>
                          <Globe2
                            aria-hidden="true"
                          />

                          {log.ip_address
                            || "IP not recorded"}
                        </span>
                      </div>


                      <div
                        className={
                          styles.facts
                        }
                      >
                        <div>
                          <span>
                            Request ID
                          </span>

                          <code>
                            {log.request_id}
                          </code>
                        </div>

                        <div>
                          <span>
                            Actor
                          </span>

                          <code>
                            {log.actor_user_id
                              || "Anonymous/system"}
                          </code>
                        </div>

                        <div>
                          <span>
                            Target
                          </span>

                          <strong>
                            {log.target_type
                              || "API"}
                          </strong>
                        </div>
                      </div>


                      <button
                        type="button"
                        className={
                          styles.detailsToggle
                        }
                        onClick={
                          () => {
                            setExpandedId(
                              expanded
                                ? null
                                : log.id,
                            );
                          }
                        }
                      >
                        {expanded
                          ? "Hide event details"
                          : "Inspect event details"}

                        {expanded ? (
                          <ChevronUp
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronDown
                            aria-hidden="true"
                          />
                        )}
                      </button>


                      {expanded ? (
                        <section
                          className={
                            styles.details
                          }
                        >
                          <div
                            className={
                              styles.detailRow
                            }
                          >
                            <span>
                              Target ID
                            </span>

                            <code>
                              {log.target_id
                                || "Not recorded"}
                            </code>
                          </div>


                          <div
                            className={
                              styles.detailRow
                            }
                          >
                            <span>
                              User agent
                            </span>

                            <code>
                              {log.user_agent
                                || "Not recorded"}
                            </code>
                          </div>


                          <div
                            className={
                              styles.jsonBlock
                            }
                          >
                            <span>
                              Event metadata
                            </span>

                            <pre>
                              {JSON.stringify(
                                log.details,
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                        </section>
                      ) : null}
                    </div>
                  </article>
                );
              },
            )}
          </div>


          <p
            className={
              styles.paginationNote
            }
          >
            Showing the latest{" "}
            {items.length} matching
            records, up to 100 per
            request.
          </p>
        </>
      ) : null}
    </div>
  );
}