"use client";

import {
  useCallback,
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
  RefreshCw,
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
  AdminBusinessDashboard,
} from "@/types/admin";

import styles from "./page.module.css";


const adminActions = [
  {
    label: "Advertisement review",
    text:
      "Review paid campaigns, request corrections and control when adverts go live.",
    href: "/admin/advertisements",
    icon: CircleDollarSign,
    eyebrow: "Revenue",
  },

  {
    label: "Listing moderation",
    text:
      "Review pending rental, property and marketplace submissions before publication.",
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
      "Review accounts, roles and platform-access status.",
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


function formatNumber(
  value: number | undefined,
): string {
  return new Intl.NumberFormat(
    "en-NG",
  ).format(
    value ?? 0,
  );
}


function formatGeneratedAt(
  value: string | undefined,
): string {
  if (!value) {
    return "Not available";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return "Not available";
  }

  return parsed.toLocaleString(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}


export default function AdminOverviewPage() {
  const [
    dashboard,
    setDashboard,
  ] =
    useState<
      AdminBusinessDashboard | null
    >(null);

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


  const loadDashboard =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const result =
            await adminService
              .getBusinessDashboard();

          setDashboard(result);

        } catch (reason) {
          setError(
            getApiErrorMessage(
              reason,
              "The admin dashboard could not be loaded.",
            ),
          );

        } finally {
          setLoading(false);
        }
      },
      [],
    );


  useEffect(() => {
    void loadDashboard();
  }, [
    loadDashboard,
  ]);


  const currentWorkload =
    dashboard
      ? (
          dashboard.listings.pending
          +
          dashboard.agents.pending
          +
          dashboard.advertisements
            .pending_review
          +
          dashboard.advertisements
            .changes_requested
        )
      : 0;

  const liveAndScheduledAds =
    dashboard
      ? (
          dashboard.advertisements.live
          +
          dashboard.advertisements
            .scheduled
        )
      : 0;

  const advertisingEngagement =
    dashboard
      ? (
          dashboard.advertisements
            .impressions
          +
          dashboard.advertisements
            .clicks
        )
      : 0;


  return (
    <div
      className={
        `${shared.page} ${styles.page}`
      }
    >
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
            Operate HomeLink
            with clarity.
          </h1>

          <p>
            Monitor revenue, users,
            listings and sponsored
            campaigns while keeping every
            moderation decision secure,
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
            {loading
              ? "—"
              : formatNumber(
                  currentWorkload,
                )}
          </strong>

          <p>
            items currently require
            administrative review
          </p>

          <small>
            Updated{" "}
            {formatGeneratedAt(
              dashboard
                ?.generated_at,
            )}
          </small>
        </div>
      </section>


      {error ? (
        <div
          className={
            styles.error
          }
          role="alert"
        >
          <div>
            <strong>
              Dashboard unavailable
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadDashboard();
            }}
          >
            <RefreshCw
              aria-hidden="true"
            />

            Try again
          </button>
        </div>
      ) : null}


      {loading ? (
        <div
          className={
            styles.statsGrid
          }
          aria-label={
            "Loading dashboard statistics"
          }
        >
          {Array.from(
            {
              length: 6,
            },
            (
              _,
              index,
            ) => (
              <div
                key={index}
                className={
                  styles.statSkeleton
                }
              />
            ),
          )}
        </div>
      ) : dashboard ? (
        <section
          className={
            styles.statsGrid
          }
          aria-label={
            "Platform statistics"
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
                {formatNumber(
                  dashboard
                    .users.total,
                )}
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
                {formatNumber(
                  dashboard
                    .listings.pending,
                )}
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
                {formatNumber(
                  dashboard
                    .agents.pending,
                )}
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
            href="/admin/advertisements"
            className={
              `${styles.stat} ${styles.statGold}`
            }
          >
            <span
              className={
                styles.statIcon
              }
            >
              <CircleDollarSign
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                {formatNumber(
                  dashboard
                    .advertisements
                    .pending_review,
                )}
              </strong>

              <span>
                Ad reviews
              </span>
            </div>

            <ArrowRight
              aria-hidden="true"
            />
          </Link>


          <div
            className={
              styles.stat
            }
          >
            <span
              className={
                styles.statIcon
              }
            >
              <CircleDollarSign
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                {formatNumber(
                  dashboard
                    .revenue
                    .successful_transactions,
                )}
              </strong>

              <span>
                Successful payments
              </span>
            </div>
          </div>


          <div
            className={
              styles.stat
            }
          >
            <span
              className={
                styles.statIcon
              }
            >
              <Activity
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                {formatNumber(
                  liveAndScheduledAds,
                )}
              </strong>

              <span>
                Active ad campaigns
              </span>
            </div>
          </div>
        </section>
      ) : null}


      <section
        className={
          styles.revenueSection
        }
      >
        <div
          className={
            styles.revenueIntro
          }
        >
          <span>
            Business overview
          </span>

          <div>
            <h2>
              Revenue at a glance
            </h2>

            <p>
              Successful HomeLink listing
              credit and sponsored
              advertisement payments.
            </p>
          </div>
        </div>


        <div
          className={
            styles.revenueGrid
          }
        >
          <article
            className={
              styles.primaryRevenue
            }
          >
            <span>
              Total successful revenue
            </span>

            <strong>
              {formatCurrency(
                (
                  dashboard
                    ?.revenue
                    .total_kobo
                  ?? 0
                ) / 100,
              )}
            </strong>

            <p>
              Combined listing-credit and
              advertising income recorded
              by the platform.
            </p>
          </article>


          <article
            className={
              styles.revenueCard
            }
          >
            <span>
              Listing credits
            </span>

            <strong>
              {formatCurrency(
                (
                  dashboard
                    ?.revenue
                    .listing_credit_kobo
                  ?? 0
                ) / 100,
              )}
            </strong>

            <small>
              Rental, property and
              marketplace credits
            </small>
          </article>


          <article
            className={
              styles.revenueCard
            }
          >
            <span>
              Advertisements
            </span>

            <strong>
              {formatCurrency(
                (
                  dashboard
                    ?.revenue
                    .advertisement_kobo
                  ?? 0
                ) / 100,
              )}
            </strong>

            <small>
              Sponsored campaign revenue
            </small>
          </article>


          <article
            className={
              styles.revenueCard
            }
          >
            <span>
              Paystack
            </span>

            <strong>
              {formatCurrency(
                (
                  dashboard
                    ?.revenue
                    .paystack_kobo
                  ?? 0
                ) / 100,
              )}
            </strong>

            <small>
              Successful Paystack value
            </small>
          </article>


          <article
            className={
              styles.revenueCard
            }
          >
            <span>
              Flutterwave
            </span>

            <strong>
              {formatCurrency(
                (
                  dashboard
                    ?.revenue
                    .flutterwave_kobo
                  ?? 0
                ) / 100,
              )}
            </strong>

            <small>
              Successful Flutterwave value
            </small>
          </article>
        </div>
      </section>


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
              Move directly into the
              HomeLink area that requires
              attention.
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

                Transactions
              </span>

              <h2>
                Payment health
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
                    dashboard
                      ?.revenue
                      .total_kobo
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
                  Successful
                </span>

                <strong>
                  {formatNumber(
                    dashboard
                      ?.revenue
                      .successful_transactions,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Pending
                </span>

                <strong>
                  {formatNumber(
                    dashboard
                      ?.revenue
                      .pending_transactions,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Failed
                </span>

                <strong>
                  {formatNumber(
                    dashboard
                      ?.revenue
                      .failed_transactions,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Refunded
                </span>

                <strong>
                  {formatNumber(
                    dashboard
                      ?.revenue
                      .refunded_transactions,
                  )}
                </strong>
              </div>
            </div>
          </section>


          <section
            className={
              styles.advertPanel
            }
          >
            <span
              className={
                styles.panelEyebrow
              }
            >
              Sponsored campaigns
            </span>

            <h2>
              Advertisement activity
            </h2>

            <div
              className={
                styles.compactMetrics
              }
            >
              <div>
                <span>
                  Total campaigns
                </span>

                <strong>
                  {formatNumber(
                    dashboard
                      ?.advertisements
                      .total,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Live
                </span>

                <strong>
                  {formatNumber(
                    dashboard
                      ?.advertisements
                      .live,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Impressions
                </span>

                <strong>
                  {formatNumber(
                    dashboard
                      ?.advertisements
                      .impressions,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Clicks
                </span>

                <strong>
                  {formatNumber(
                    dashboard
                      ?.advertisements
                      .clicks,
                  )}
                </strong>
              </div>
            </div>

            <p>
              {formatNumber(
                advertisingEngagement,
              )}{" "}
              recorded advertisement
              interactions.
            </p>

            <Link
              href="/admin/advertisements"
            >
              Review campaigns

              <ArrowRight
                aria-hidden="true"
              />
            </Link>
          </section>


          <section
            className={
              styles.priorityPanel
            }
          >
            <span
              className={
                styles.panelEyebrow
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
              location details and
              supporting evidence before
              publication. Verification
              means HomeLink reviewed the
              submitted information—it is
              not a transaction guarantee.
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