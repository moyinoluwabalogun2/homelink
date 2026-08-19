"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowRight,
  Bell,
  Bookmark,
  CreditCard,
  List,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Store,
} from "lucide-react";

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
  dashboardService,
} from "@/services/dashboard-service";

import type {
  UserDashboardSummary,
} from "@/types/dashboard";

import styles from "@/components/dashboard/DashboardPage.module.css";


const quickActions = [
  {
    label: "Browse rentals",
    text: "Find rooms and homes around OOU.",
    href: "/rentals",
    icon: Store,
  },
  {
    label: "Post marketplace item",
    text: "Create a listing and submit it for review.",
    href: "/post-listing/marketplace",
    icon: Plus,
  },
  {
    label: "Review inquiries",
    text: "See your messages and property inquiries.",
    href: "/dashboard/inquiries",
    icon: MessageSquare,
  },
  {
    label: "Manage listings",
    text: "Check drafts, pending posts and live listings.",
    href: "/dashboard/listings",
    icon: List,
  },
];


export default function DashboardPage() {
  const {
    user,
  } = useAuth();

  const [
    summary,
    setSummary,
  ] =
    useState<UserDashboardSummary | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState("");


  useEffect(() => {
    let active = true;

    dashboardService
      .getSummary()
      .then((record) => {
        if (!active) {
          return;
        }

        setSummary(record);
        setError("");
      })
      .catch((reason) => {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            reason,
            "Dashboard summary could not be loaded.",
          ),
        );
      });

    return () => {
      active = false;
    };
  }, []);


  const firstName =
    user?.full_name
      ?.trim()
      .split(" ")[0] ??
    "there";


  const stats =
    summary
      ? [
          {
            label: "Saved listings",
            value:
              summary.saved_listings,
            href: "/dashboard/saved",
            icon: Bookmark,
          },
          {
            label: "Sent inquiries",
            value:
              summary.sent_inquiries,
            href: "/dashboard/inquiries",
            icon: Send,
          },
          {
            label: "Received inquiries",
            value:
              summary.received_inquiries,
            href: "/dashboard/inquiries",
            icon: MessageSquare,
          },
          {
            label: "Unread notifications",
            value:
              summary.unread_notifications,
            href: "/dashboard/notifications",
            icon: Bell,
          },
        ]
      : [];


  return (
    <div
      className={
        styles.page
      }
    >
      {/* ===================================================
          HEADER
      ==================================================== */}

      <header
        className={
          styles.pageHeader
        }
      >
        <div
          className={
            styles.headingBlock
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

            {titleCase(
              user?.role ??
                "user",
            )}{" "}
            workspace
          </span>

          <h1>
            Good to see you,
            <br />
            {firstName}.
          </h1>

          <p>
            Your saved places,
            inquiries, listings
            and posting balance
            are organised here.
          </p>
        </div>


        {user?.role !==
        "admin" ? (
          <Link
            href="/post-listing"
            className={
              styles.primaryButton
            }
          >
            <Plus
              aria-hidden="true"
            />

            Post a listing
          </Link>
        ) : null}
      </header>


      {/* ===================================================
          ERROR
      ==================================================== */}

      {error ? (
        <div
          className={
            styles.error
          }
          role="alert"
        >
          <strong>
            Couldn&apos;t load
            everything.
          </strong>

          <span>
            {error}
          </span>
        </div>
      ) : null}


      {/* ===================================================
          SUMMARY
      ==================================================== */}

      <section
        className={
          styles.summarySection
        }
      >
        <div
          className={
            styles.sectionIntro
          }
        >
          <span>
            At a glance
          </span>

          <h2>
            Your HomeLink
            activity.
          </h2>
        </div>


        {!summary ? (
          <div
            className={
              styles.loadingGrid
            }
            aria-label="Loading dashboard summary"
          >
            {Array.from(
              {
                length: 4,
              },
              (_, index) => (
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
        ) : (
          <div
            className={
              styles.statsGrid
            }
          >
            {stats.map(
              (stat) => {
                const Icon =
                  stat.icon;

                return (
                  <Link
                    key={
                      stat.label
                    }
                    href={
                      stat.href
                    }
                    className={
                      styles.statCard
                    }
                  >
                    <div
                      className={
                        styles.statTop
                      }
                    >
                      <span
                        className={
                          styles.statIcon
                        }
                      >
                        <Icon
                          aria-hidden="true"
                        />
                      </span>

                      <ArrowRight
                        aria-hidden="true"
                      />
                    </div>

                    <strong>
                      {stat.value}
                    </strong>

                    <span>
                      {stat.label}
                    </span>
                  </Link>
                );
              },
            )}
          </div>
        )}
      </section>


      {/* ===================================================
          ACTIONS + CREDITS
      ==================================================== */}

      <section
        className={
          styles.workspaceGrid
        }
      >
        <article
          className={
            styles.actionsPanel
          }
        >
          <div
            className={
              styles.panelHeader
            }
          >
            <div>
              <span>
                Shortcuts
              </span>

              <h2>
                What do you
                want to do?
              </h2>
            </div>
          </div>


          <div
            className={
              styles.quickGrid
            }
          >
            {quickActions.map(
              (action) => {
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
                      styles.quickCard
                    }
                  >
                    <Icon
                      aria-hidden="true"
                    />

                    <div>
                      <strong>
                        {
                          action.label
                        }
                      </strong>

                      <span>
                        {
                          action.text
                        }
                      </span>
                    </div>

                    <ArrowRight
                      aria-hidden="true"
                    />
                  </Link>
                );
              },
            )}
          </div>
        </article>


        <article
          className={
            styles.creditPanel
          }
        >
          <div
            className={
              styles.creditHeading
            }
          >
            <span
              className={
                styles.creditIcon
              }
            >
              <CreditCard
                aria-hidden="true"
              />
            </span>

            <div>
              <span>
                Posting balance
              </span>

              <h2>
                Your credits
              </h2>
            </div>
          </div>


          <div
            className={
              styles.creditList
            }
          >
            {(summary?.credits ??
              []).map(
              (credit) => {
                const total =
                  credit.free_remaining +
                  credit.paid_remaining;

                return (
                  <div
                    key={
                      credit.credit_type
                    }
                    className={
                      styles.creditRow
                    }
                  >
                    <div>
                      <strong>
                        {titleCase(
                          credit.credit_type,
                        )}
                      </strong>

                      <span>
                        {
                          credit.free_remaining
                        }{" "}
                        free ·{" "}
                        {
                          credit.paid_remaining
                        }{" "}
                        paid
                      </span>
                    </div>

                    <b>
                      {total}
                    </b>
                  </div>
                );
              },
            )}


            {summary &&
            summary.credits
              .length === 0 ? (
              <p
                className={
                  styles.emptyCredits
                }
              >
                No posting
                balances have
                been created yet.
              </p>
            ) : null}


            {!summary ? (
              <>
                <div
                  className={
                    styles.creditSkeleton
                  }
                />

                <div
                  className={
                    styles.creditSkeleton
                  }
                />
              </>
            ) : null}
          </div>


          <Link
            href="/dashboard/credits"
            className={
              styles.creditLink
            }
          >
            Credits & payments

            <ArrowRight
              aria-hidden="true"
            />
          </Link>
        </article>
      </section>


      {/* ===================================================
          LISTING STATUS
      ==================================================== */}

      {summary &&
      Object.keys(
        summary.listings_by_status,
      ).length > 0 ? (
        <section
          className={
            styles.listingsSection
          }
        >
          <div
            className={
              styles.listingsHeader
            }
          >
            <div>
              <span>
                Your posts
              </span>

              <h2>
                Listings by
                status.
              </h2>
            </div>

            <Link href="/dashboard/listings">
              View all
              <ArrowRight
                aria-hidden="true"
              />
            </Link>
          </div>


          <div
            className={
              styles.statusList
            }
          >
            {Object.entries(
              summary.listings_by_status,
            ).map(
              ([
                status,
                count,
              ]) => (
                <div
                  key={
                    status
                  }
                  className={
                    styles.statusRow
                  }
                >
                  <span
                    className={
                      styles.statusMarker
                    }
                    aria-hidden="true"
                  />

                  <div>
                    <strong>
                      {titleCase(
                        status,
                      )}
                    </strong>

                    <span>
                      Current
                      listing count
                    </span>
                  </div>

                  <b>
                    {count}
                  </b>
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}