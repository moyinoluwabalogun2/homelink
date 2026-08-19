"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  Activity,
  ArrowRight,
  CheckSquare,
  CircleDollarSign,
  FileCheck2,
  Flag,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import shared from "@/components/dashboard/DashboardPage.module.css";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatCurrency,
} from "@/lib/formatters";

import {
  adminService,
} from "@/services/admin-service";

import type {
  AdminDashboardSummary,
} from "@/types/admin";

import styles from "./page.module.css";


const adminActions = [
  {
    label: "Listing moderation",
    text:
      "Review pending property and marketplace submissions before they go live.",
    href: "/admin/listings",
    icon: CheckSquare,
    eyebrow: "Moderation",
  },

  {
    label: "Agent verification",
    text:
      "Inspect protected verification documents and approve trusted providers.",
    href: "/admin/agents",
    icon: FileCheck2,
    eyebrow: "Trust",
  },

  {
    label: "Reports",
    text:
      "Investigate reported listings and record clear moderation decisions.",
    href: "/admin/reports",
    icon: Flag,
    eyebrow: "Safety",
  },

  {
    label: "User management",
    text:
      "Review accounts, roles and platform access status.",
    href: "/admin/users",
    icon: Users,
    eyebrow: "Accounts",
  },

  {
    label: "Audit trail",
    text:
      "Inspect administrative activity and important platform write events.",
    href: "/admin/audit",
    icon: Activity,
    eyebrow: "Operations",
  },

  {
    label: "System maintenance",
    text:
      "Check backend readiness and run controlled maintenance tasks.",
    href: "/admin/system",
    icon: Settings,
    eyebrow: "System",
  },
];


export default function AdminOverviewPage() {
  const [
    summary,
    setSummary,
  ] =
    useState<AdminDashboardSummary | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState("");


  useEffect(() => {
    adminService
      .getDashboardSummary()
      .then(
        setSummary,
      )
      .catch(
        (reason) => {
          setError(
            getApiErrorMessage(
              reason,
              "The admin summary could not be loaded.",
            ),
          );
        },
      );
  }, []);


  return (
    <div
      className={
        shared.page
      }
    >
      {/* =====================================================
          HERO
      ====================================================== */}

      <section
        className={
          styles.hero
        }
      >
        <div
          className={
            styles.heroCopy
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            <ShieldCheck
              aria-hidden="true"
            />

            HomeLink administration
          </span>

          <h1>
            Keep the marketplace
            trustworthy.
          </h1>

          <p>
            Review what enters HomeLink,
            verify property providers and
            keep moderation decisions clear,
            consistent and traceable.
          </p>
        </div>


        <div
          className={
            styles.heroAside
          }
        >
          <span>
            Current workload
          </span>

          <strong>
            {summary
              ? (
                  summary.pending_listings
                  +
                  summary.pending_agent_applications
                  +
                  summary.open_reports
                )
              : "—"}
          </strong>

          <p>
            items currently need
            administrative attention
          </p>
        </div>
      </section>


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
          PRIMARY STATS
      ====================================================== */}

      {!summary ? (
        <div
          className={
            styles.statsGrid
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
                  styles.statSkeleton
                }
              />
            ),
          )}
        </div>
      ) : (
        <section
          className={
            styles.statsGrid
          }
        >
          <Link
            href="/admin/users"
            className={
              styles.stat
            }
          >
            <span
              className={
                styles.statIcon
              }
            >
              <Users
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                {summary.users}
              </strong>

              <span>
                Registered users
              </span>
            </div>

            <ArrowRight
              aria-hidden="true"
            />
          </Link>


          <Link
            href="/admin/listings"
            className={
              styles.stat
            }
          >
            <span
              className={
                styles.statIcon
              }
            >
              <CheckSquare
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                {
                  summary.pending_listings
                }
              </strong>

              <span>
                Pending listings
              </span>
            </div>

            <ArrowRight
              aria-hidden="true"
            />
          </Link>


          <Link
            href="/admin/agents"
            className={
              styles.stat
            }
          >
            <span
              className={
                styles.statIcon
              }
            >
              <FileCheck2
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                {
                  summary.pending_agent_applications
                }
              </strong>

              <span>
                Agent reviews
              </span>
            </div>

            <ArrowRight
              aria-hidden="true"
            />
          </Link>


          <Link
            href="/admin/reports"
            className={
              styles.stat
            }
          >
            <span
              className={
                styles.statIcon
              }
            >
              <Flag
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                {
                  summary.open_reports
                }
              </strong>

              <span>
                Open reports
              </span>
            </div>

            <ArrowRight
              aria-hidden="true"
            />
          </Link>
        </section>
      )}


      {/* =====================================================
          OPERATIONS
      ====================================================== */}

      <section
        className={
          styles.workspace
        }
      >
        <div
          className={
            styles.mainColumn
          }
        >
          <div
            className={
              styles.sectionIntro
            }
          >
            <div>
              <span>
                Admin workspace
              </span>

              <h2>
                Moderation and operations
              </h2>
            </div>

            <p>
              Jump directly into the
              part of HomeLink that needs
              review.
            </p>
          </div>


          <div
            className={
              styles.actionList
            }
          >
            {adminActions.map(
              (
                action,
                index,
              ) => {
                const Icon =
                  action.icon;

                return (
                  <Link
                    key={
                      action.href
                    }
                    href={
                      action.href
                    }
                    className={
                      styles.actionRow
                    }
                  >
                    <span
                      className={
                        styles.actionNumber
                      }
                    >
                      {String(
                        index + 1,
                      ).padStart(
                        2,
                        "0",
                      )}
                    </span>


                    <span
                      className={
                        styles.actionIcon
                      }
                    >
                      <Icon
                        aria-hidden="true"
                      />
                    </span>


                    <div
                      className={
                        styles.actionCopy
                      }
                    >
                      <span>
                        {
                          action.eyebrow
                        }
                      </span>

                      <strong>
                        {
                          action.label
                        }
                      </strong>

                      <p>
                        {
                          action.text
                        }
                      </p>
                    </div>


                    <ArrowRight
                      className={
                        styles.actionArrow
                      }
                      aria-hidden="true"
                    />
                  </Link>
                );
              },
            )}
          </div>
        </div>


        {/* ===================================================
            SIDE COLUMN
        ==================================================== */}

        <aside
          className={
            styles.sideColumn
          }
        >
          <section
            className={
              styles.paymentPanel
            }
          >
            <div
              className={
                styles.sideHeading
              }
            >
              <span>
                <CircleDollarSign
                  aria-hidden="true"
                />

                Payments
              </span>

              <h2>
                Transaction snapshot
              </h2>
            </div>


            <div
              className={
                styles.paymentValue
              }
            >
              <span>
                Successful value
              </span>

              <strong>
                {formatCurrency(
                  (
                    summary?.successful_payment_value_kobo
                    ?? 0
                  ) / 100,
                )}
              </strong>
            </div>


            <div
              className={
                styles.paymentMeta
              }
            >
              <div>
                <span>
                  Successful payments
                </span>

                <strong>
                  {
                    summary?.successful_payments
                    ?? 0
                  }
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong>
                  Tracking
                </strong>
              </div>
            </div>
          </section>


          <section
            className={
              styles.priorityPanel
            }
          >
            <span
              className={
                styles.priorityEyebrow
              }
            >
              Moderation standard
            </span>

            <h2>
              Review evidence,
              not appearances.
            </h2>

            <p>
              Confirm listing quality,
              location information and
              supporting evidence before
              publishing. Agent verification
              should always include review
              of the current protected
              document submission.
            </p>

            <Link
              href="/admin/agents"
            >
              Review applications

              <ArrowRight
                aria-hidden="true"
              />
            </Link>
          </section>
        </aside>
      </section>
    </div>
  );
}