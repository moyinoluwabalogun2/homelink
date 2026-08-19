"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  Clock3,
  Database,
  FileX2,
  Play,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";

import shared from "@/components/dashboard/DashboardPage.module.css";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  titleCase,
} from "@/lib/formatters";

import {
  adminService,
} from "@/services/admin-service";

import type {
  MaintenanceResult,
  SystemReadiness,
} from "@/types/admin";

import styles from "./page.module.css";


const cleanupLabels:
  Record<string, string> = {
    expired_listings:
      "Expired listings",

    deleted_sessions:
      "Expired sessions deleted",

    deleted_password_reset_tokens:
      "Password reset tokens deleted",

    deleted_email_verification_tokens:
      "Email verification tokens deleted",

    deleted_notifications:
      "Old read notifications deleted",

    deleted_webhook_events:
      "Processed webhook events deleted",

    deleted_audit_logs:
      "Expired audit records deleted",

    purged_agent_verification_documents:
      "Verification files purged",
  };


function readinessLabel(
  value:
    string | undefined,
): string {
  return titleCase(
    value ?? "unknown",
  );
}


export default function AdminSystemPage() {
  const [
    readiness,
    setReadiness,
  ] =
    useState<SystemReadiness | null>(
      null,
    );

  const [
    maintenance,
    setMaintenance,
  ] =
    useState<MaintenanceResult | null>(
      null,
    );

  const [
    checking,
    setChecking,
  ] =
    useState(true);

  const [
    running,
    setRunning,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    checkedAt,
    setCheckedAt,
  ] =
    useState<Date | null>(
      null,
    );


  /* =========================================================
     READINESS

     Initial request + explicit manual refresh only.
  ========================================================= */

  const checkReadiness =
    useCallback(
      async () => {
        setChecking(
          true,
        );

        setError(
          "",
        );

        try {
          const result =
            await adminService.getReadiness();

          setReadiness(
            result,
          );

          setCheckedAt(
            new Date(),
          );
        } catch (
          reason
        ) {
          setError(
            getApiErrorMessage(
              reason,
              "System readiness could not be checked.",
            ),
          );

          setReadiness(
            null,
          );
        } finally {
          setChecking(
            false,
          );
        }
      },
      [],
    );


  useEffect(() => {
    void checkReadiness();
  }, [
    checkReadiness,
  ]);


  /* =========================================================
     MAINTENANCE
  ========================================================= */

  const runMaintenance =
    async () => {
      if (running) {
        return;
      }

      const confirmed =
        window.confirm(
          "Run HomeLink maintenance now? "
          + "Expired records and retained verification files "
          + "that have reached their cleanup date may be removed.",
        );

      if (!confirmed) {
        return;
      }

      setRunning(
        true,
      );

      try {
        const result =
          await adminService.runMaintenance();

        setMaintenance(
          result,
        );

        toast.success(
          "Maintenance completed successfully.",
        );

        /*
         * Do not automatically call /health/ready here.
         *
         * Maintenance completing successfully already confirms
         * the request completed. Admin can explicitly run a new
         * readiness check when needed.
         */
      } catch (
        reason
      ) {
        toast.error(
          getApiErrorMessage(
            reason,
          ),
        );
      } finally {
        setRunning(
          false,
        );
      }
    };


  const apiReady =
    readiness?.status ===
    "ready";

  const databaseReady =
    readiness?.checks.database ===
    "ok";

  const redisReady =
    readiness?.checks.redis ===
    "ok";


  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div
      className={
        shared.page
      }
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

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
            <Settings
              aria-hidden="true"
            />

            System operations
          </span>

          <h1>
            Backend health and maintenance.
          </h1>

          <p>
            Inspect API, PostgreSQL and
            Redis readiness, then run
            controlled retention cleanup
            when administrative maintenance
            is required.
          </p>
        </div>


        <button
          type="button"
          className={
            styles.refreshButton
          }
          onClick={
            () => {
              void checkReadiness();
            }
          }
          disabled={
            checking
          }
        >
          <RefreshCw
            aria-hidden="true"
          />

          {checking
            ? "Checking…"
            : "Check readiness"}
        </button>
      </header>


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
          HEALTH
      ====================================================== */}

      <section
        className={
          styles.healthSection
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              Live status
            </span>

            <h2>
              Service readiness
            </h2>
          </div>

          <p>
            {checkedAt
              ? (
                  `Last checked ${checkedAt.toLocaleTimeString(
                    [],
                    {
                      hour:
                        "2-digit",
                      minute:
                        "2-digit",
                    },
                  )}`
                )
              : "Not checked yet"}
          </p>
        </div>


        <div
          className={
            styles.healthGrid
          }
        >
          <article
            className={
              styles.healthCard
            }
            data-ready={
              apiReady
            }
          >
            <span
              className={
                styles.healthIcon
              }
            >
              <Server
                aria-hidden="true"
              />
            </span>

            <div>
              <span>
                API readiness
              </span>

              <strong>
                {checking
                  ? "Checking…"
                  : readinessLabel(
                      readiness?.status,
                    )}
              </strong>
            </div>

            {apiReady ? (
              <CheckCircle2
                className={
                  styles.ok
                }
                aria-hidden="true"
              />
            ) : (
              <XCircle
                className={
                  styles.bad
                }
                aria-hidden="true"
              />
            )}
          </article>


          <article
            className={
              styles.healthCard
            }
            data-ready={
              databaseReady
            }
          >
            <span
              className={
                styles.healthIcon
              }
            >
              <Database
                aria-hidden="true"
              />
            </span>

            <div>
              <span>
                PostgreSQL
              </span>

              <strong>
                {readinessLabel(
                  readiness?.checks.database,
                )}
              </strong>
            </div>

            {databaseReady ? (
              <CheckCircle2
                className={
                  styles.ok
                }
                aria-hidden="true"
              />
            ) : (
              <XCircle
                className={
                  styles.bad
                }
                aria-hidden="true"
              />
            )}
          </article>


          <article
            className={
              styles.healthCard
            }
            data-ready={
              redisReady
            }
          >
            <span
              className={
                styles.healthIcon
              }
            >
              <Server
                aria-hidden="true"
              />
            </span>

            <div>
              <span>
                Redis
              </span>

              <strong>
                {readinessLabel(
                  readiness?.checks.redis,
                )}
              </strong>
            </div>

            {redisReady ? (
              <CheckCircle2
                className={
                  styles.ok
                }
                aria-hidden="true"
              />
            ) : (
              <XCircle
                className={
                  styles.bad
                }
                aria-hidden="true"
              />
            )}
          </article>
        </div>
      </section>


      {/* =====================================================
          MAINTENANCE
      ====================================================== */}

      <section
        className={
          styles.maintenance
        }
      >
        <div
          className={
            styles.maintenanceCopy
          }
        >
          <span
            className={
              styles.maintenanceIcon
            }
          >
            <Trash2
              aria-hidden="true"
            />
          </span>

          <div>
            <span
              className={
                styles.maintenanceEyebrow
              }
            >
              Retention cleanup
            </span>

            <h2>
              Remove records that have
              reached their retention limit.
            </h2>

            <p>
              Maintenance can expire old
              listings and remove expired
              sessions, verification tokens,
              read notifications, processed
              webhooks, old audit records
              and eligible agent verification
              files.
            </p>
          </div>
        </div>


        <button
          type="button"
          className={
            styles.maintenanceButton
          }
          onClick={
            () => {
              void runMaintenance();
            }
          }
          disabled={
            running
          }
        >
          <Play
            aria-hidden="true"
          />

          {running
            ? "Running maintenance…"
            : "Run maintenance"}
        </button>
      </section>


      {/* =====================================================
          RESULT
      ====================================================== */}

      {maintenance ? (
        <section
          className={
            styles.results
          }
        >
          <div
            className={
              styles.sectionHeading
            }
          >
            <div>
              <span>
                Latest run
              </span>

              <h2>
                Maintenance result
              </h2>
            </div>

            <ShieldCheck
              aria-hidden="true"
            />
          </div>


          <div
            className={
              styles.resultGrid
            }
          >
            {Object.entries(
              maintenance,
            ).map(
              ([
                key,
                value,
              ]) => (
                <div
                  key={
                    key
                  }
                >
                  <span>
                    {cleanupLabels[
                      key
                    ] ??
                      titleCase(
                        key,
                      )}
                  </span>

                  <strong>
                    {value}
                  </strong>
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}


      {/* =====================================================
          AUTOMATION / RETENTION NOTE
      ====================================================== */}

      <section
        className={
          styles.operationsNote
        }
      >
        <span>
          <Clock3
            aria-hidden="true"
          />
        </span>

        <div>
          <strong>
            Automatic maintenance is
            separate from this manual
            control.
          </strong>

          <p>
            The scheduled maintenance
            runner handles routine cleanup
            automatically. This button is
            for deliberate administrator
            runs when maintenance needs to
            be triggered manually.
          </p>
        </div>
      </section>


      <section
        className={
          styles.retentionNote
        }
      >
        <span>
          <FileX2
            aria-hidden="true"
          />
        </span>

        <div>
          <strong>
            Verification-file retention
          </strong>

          <p>
            Reviewed agent verification
            documents remain available only
            during their configured retention
            period. After cleanup, the
            physical protected asset is
            removed while audit metadata is
            retained.
          </p>
        </div>
      </section>
    </div>
  );
}