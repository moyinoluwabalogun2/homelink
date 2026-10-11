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
  ArrowRight,
  Building2,
  CheckCircle2,
  Home,
  Inbox,
  List,
  MapPin,
  MessageSquare,
  Plus,
  ShieldCheck,
} from "lucide-react";

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
  agentService,
} from "@/services/agent-service";

import {
  dashboardService,
} from "@/services/dashboard-service";

import {
  engagementService,
} from "@/services/engagement-service";

import type {
  AgentApplicationProfile,
} from "@/types/agent";

import type {
  UserDashboardSummary,
} from "@/types/dashboard";

import type {
  Inquiry,
} from "@/types/engagement";

import styles from "./page.module.css";


export default function AgentWorkspacePage() {
  const profileRequestRef =
    useRef(0);

  const summaryRequestRef =
    useRef(0);

  const leadsRequestRef =
    useRef(0);

  const [
    profile,
    setProfile,
  ] = useState<
    AgentApplicationProfile | null
  >(null);

  const [
    summary,
    setSummary,
  ] = useState<
    UserDashboardSummary | null
  >(null);

  const [
    leads,
    setLeads,
  ] = useState<
    Inquiry[] | null
  >(null);

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(true);

  const [
    summaryLoading,
    setSummaryLoading,
  ] = useState(true);

  const [
    leadsLoading,
    setLeadsLoading,
  ] = useState(true);

  const [
    profileError,
    setProfileError,
  ] = useState("");

  const [
    summaryError,
    setSummaryError,
  ] = useState("");

  const [
    leadsError,
    setLeadsError,
  ] = useState("");


  const loadProfile =
    useCallback(
      async () => {
        const requestVersion =
          ++profileRequestRef.current;

        setProfileLoading(
          true,
        );

        setProfileError("");

        try {
          const result =
            await agentService
              .getMine();

          if (
            requestVersion !==
            profileRequestRef.current
          ) {
            return;
          }

          setProfile(
            result,
          );

          if (!result) {
            setProfileError(
              "HomeLink could not find your agent profile.",
            );
          }
        } catch (error) {
          if (
            requestVersion !==
            profileRequestRef.current
          ) {
            return;
          }

          setProfile(
            null,
          );

          setProfileError(
            getApiErrorMessage(
              error,
              "Your agent profile could not be loaded.",
            ),
          );
        } finally {
          if (
            requestVersion ===
            profileRequestRef.current
          ) {
            setProfileLoading(
              false,
            );
          }
        }
      },
      [],
    );


  const loadSummary =
    useCallback(
      async () => {
        const requestVersion =
          ++summaryRequestRef.current;

        setSummaryLoading(
          true,
        );

        setSummaryError("");

        try {
          const result =
            await dashboardService
              .getSummary();

          if (
            requestVersion !==
            summaryRequestRef.current
          ) {
            return;
          }

          setSummary(
            result,
          );
        } catch (error) {
          if (
            requestVersion !==
            summaryRequestRef.current
          ) {
            return;
          }

          setSummaryError(
            getApiErrorMessage(
              error,
              "Your dashboard summary could not be loaded.",
            ),
          );
        } finally {
          if (
            requestVersion ===
            summaryRequestRef.current
          ) {
            setSummaryLoading(
              false,
            );
          }
        }
      },
      [],
    );


  const loadLeads =
    useCallback(
      async () => {
        const requestVersion =
          ++leadsRequestRef.current;

        setLeadsLoading(
          true,
        );

        setLeadsError("");

        try {
          const result =
            await engagementService
              .listReceivedInquiries();

          if (
            requestVersion !==
            leadsRequestRef.current
          ) {
            return;
          }

          setLeads(
            result,
          );
        } catch (error) {
          if (
            requestVersion !==
            leadsRequestRef.current
          ) {
            return;
          }

          setLeadsError(
            getApiErrorMessage(
              error,
              "Incoming leads could not be loaded.",
            ),
          );
        } finally {
          if (
            requestVersion ===
            leadsRequestRef.current
          ) {
            setLeadsLoading(
              false,
            );
          }
        }
      },
      [],
    );


  useEffect(() => {
    void loadProfile();
    void loadSummary();
    void loadLeads();

    return () => {
      profileRequestRef.current +=
        1;

      summaryRequestRef.current +=
        1;

      leadsRequestRef.current +=
        1;
    };
  }, [
    loadProfile,
    loadSummary,
    loadLeads,
  ]);


  const publishedListings =
    useMemo(
      () => {
        if (!summary) {
          return null;
        }

        return (
          summary
            .listings_by_status
            .published ??
          0
        );
      },
      [
        summary,
      ],
    );


  const openLeads =
    useMemo(
      () => {
        if (!leads) {
          return null;
        }

        return leads.filter(
          (lead) =>
            lead.status ===
            "open",
        ).length;
      },
      [
        leads,
      ],
    );


  const credits =
    summary?.credits ??
    null;


  return (
    <div
      className={
        shared.page
      }
    >
      <header
        className={`${shared.pageHeader} ${styles.agentHeader}`}
      >
        <div>
          <span
            className={
              shared.eyebrow
            }
          >
            <ShieldCheck
              aria-hidden="true"
            />

            Verified workspace
          </span>

          <h1>
            Manage your
            property activity.
          </h1>

          <p>
            Keep listings accurate,
            respond to prospective
            renters quickly and
            maintain a trusted
            HomeLink profile.
          </p>
        </div>

        <Link
          href="/post-listing"
          className={
            shared.primaryButton
          }
        >
          <Plus
            aria-hidden="true"
          />

          Add listing
        </Link>
      </header>

      <section
        className={
          styles.statsSection
        }
        aria-label="Agent summary"
      >
        <div
          className={
            shared.statsGrid
          }
        >
          <article
            className={
              shared.statCard
            }
          >
            <span
              className={
                shared.statIcon
              }
            >
              <List
                aria-hidden="true"
              />
            </span>

            <strong>
              {summaryLoading &&
              !summary
                ? "\u2026"
                : summaryError &&
                    !summary
                  ? "\u2014"
                  : publishedListings ??
                    "\u2014"}
            </strong>

            <span>
              Published listings
            </span>
          </article>

          <article
            className={
              shared.statCard
            }
          >
            <span
              className={
                shared.statIcon
              }
            >
              <Inbox
                aria-hidden="true"
              />
            </span>

            <strong>
              {leadsLoading &&
              !leads
                ? "\u2026"
                : leadsError &&
                    !leads
                  ? "\u2014"
                  : openLeads ??
                    "\u2014"}
            </strong>

            <span>
              Open leads
            </span>
          </article>

          <article
            className={
              shared.statCard
            }
          >
            <span
              className={
                shared.statIcon
              }
            >
              <MessageSquare
                aria-hidden="true"
              />
            </span>

            <strong>
              {summaryLoading &&
              !summary
                ? "\u2026"
                : summaryError &&
                    !summary
                  ? "\u2014"
                  : summary
                      ?.received_inquiries ??
                    "\u2014"}
            </strong>

            <span>
              Total inquiries
            </span>
          </article>

          <article
            className={
              shared.statCard
            }
          >
            <span
              className={
                shared.statIcon
              }
            >
              <CheckCircle2
                aria-hidden="true"
              />
            </span>

            <strong>
              {profileLoading &&
              !profile
                ? "\u2026"
                : profileError &&
                    !profile
                  ? "\u2014"
                  : profile
                      ?.years_experience ??
                    "\u2014"}
            </strong>

            <span>
              Years of experience
            </span>
          </article>
        </div>

        {summaryError ? (
          <div
            className={
              styles.inlineError
            }
          >
            <div>
              <strong>
                Dashboard summary
                unavailable
              </strong>

              <span>
                {summaryError}
              </span>
            </div>

            <button
              type="button"
              className={
                styles.retryButton
              }
              disabled={
                summaryLoading
              }
              onClick={() => {
                void loadSummary();
              }}
            >
              {summaryLoading
                ? "Trying again\u2026"
                : "Try again"}
            </button>
          </div>
        ) : null}
      </section>

      <section
        className={
          styles.profileGrid
        }
      >
        <article
          className={
            styles.profileCard
          }
        >
          {profileLoading &&
          !profile ? (
            <div
              className={
                styles.profileLoading
              }
            >
              <div
                className={
                  styles.profileLoadingIcon
                }
              />

              <div>
                <strong>
                  Loading agent
                  profile
                </strong>

                <span>
                  Fetching your
                  verified workspace.
                </span>
              </div>
            </div>
          ) : profileError ||
            !profile ? (
            <div
              className={
                styles.profileState
              }
            >
              <Building2
                aria-hidden="true"
              />

              <div>
                <strong>
                  Agent profile
                  unavailable
                </strong>

                <span>
                  {profileError ||
                    "HomeLink could not load your agent profile."}
                </span>
              </div>

              <button
                type="button"
                className={
                  styles.retryButton
                }
                disabled={
                  profileLoading
                }
                onClick={() => {
                  void loadProfile();
                }}
              >
                {profileLoading
                  ? "Trying again\u2026"
                  : "Try again"}
              </button>
            </div>
          ) : (
            <>
              <div
                className={
                  styles.profileHeading
                }
              >
                <span>
                  <Building2
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <small>
                    {titleCase(
                      profile.agent_type,
                    )}
                  </small>

                  <h2>
                    {profile.business_name ||
                      profile.user
                        .full_name}
                  </h2>
                </div>

                <StatusBadge
                  status={
                    profile.status
                  }
                />
              </div>

              <p>
                {profile.bio ||
                  "Your verified profile information will appear here."}
              </p>

              <div
                className={
                  styles.areaList
                }
              >
                {profile
                  .coverage_areas
                  .map(
                    (
                      coverage,
                    ) => (
                      <span
                        key={
                          coverage
                            .area
                            .id
                        }
                      >
                        <MapPin
                          aria-hidden="true"
                        />

                        {
                          coverage
                            .area
                            .name
                        }
                      </span>
                    ),
                  )}
              </div>

              <div
                className={
                  styles.profileMeta
                }
              >
                <div>
                  <span>
                    Approved
                  </span>

                  <strong>
                    {profile.approved_at
                      ? formatDate(
                          profile.approved_at,
                        )
                      : "Not available"}
                  </strong>
                </div>

                <div>
                  <span>
                    Documents
                  </span>

                  <strong>
                    {
                      profile
                        .documents
                        .length
                    }
                  </strong>
                </div>
              </div>
            </>
          )}
        </article>

        <aside
          className={
            shared.creditPanel
          }
        >
          <div
            className={
              shared.creditHeading
            }
          >
            <span
              className={
                shared.creditIcon
              }
            >
              <CheckCircle2
                aria-hidden="true"
              />
            </span>

            <div>
              <span>
                Posting access
              </span>

              <h2>
                Listing credits
              </h2>
            </div>
          </div>

          {summaryLoading &&
          !summary ? (
            <div
              className={
                shared.creditList
              }
              aria-label="Loading credit balances"
              aria-busy="true"
            >
              {Array.from(
                {
                  length: 3,
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
                      shared.creditSkeleton
                    }
                    aria-hidden="true"
                  />
                ),
              )}
            </div>
          ) : summaryError &&
            !summary ? (
            <>
              <p
                className={
                  shared.emptyCredits
                }
              >
                Your credit balances
                could not be loaded.
              </p>

              <button
                type="button"
                className={
                  styles.creditRetry
                }
                disabled={
                  summaryLoading
                }
                onClick={() => {
                  void loadSummary();
                }}
              >
                {summaryLoading
                  ? "Trying again\u2026"
                  : "Try again"}
              </button>
            </>
          ) : credits &&
            credits.length >
              0 ? (
            <div
              className={
                shared.creditList
              }
            >
              {credits.map(
                (credit) => {
                  const total =
                    credit
                      .free_remaining +
                    credit
                      .paid_remaining;

                  return (
                    <div
                      key={
                        credit
                          .credit_type
                      }
                      className={
                        shared.creditRow
                      }
                    >
                      <div>
                        <strong>
                          {titleCase(
                            credit
                              .credit_type,
                          )}
                        </strong>

                        <span>
                          {
                            credit
                              .free_remaining
                          }{" "}
                          free{" "}
                          {"\u00B7"}{" "}
                          {
                            credit
                              .paid_remaining
                          }{" "}
                          purchased
                        </span>
                      </div>

                      <b>
                        {total}
                      </b>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <p
              className={
                shared.emptyCredits
              }
            >
              No posting credits are
              currently available.
            </p>
          )}
        </aside>
      </section>

      <section
        className={
          shared.actionsPanel
        }
      >
        <div
          className={
            shared.panelHeader
          }
        >
          <div>
            <span>
              Quick access
            </span>

            <h2>
              Agent actions
            </h2>
          </div>
        </div>

        <div
          className={
            shared.quickGrid
          }
        >
          <Link
            href="/post-listing/rental"
            className={
              shared.quickCard
            }
          >
            <Home
              aria-hidden="true"
            />

            <div>
              <strong>
                Post rental
              </strong>

              <span>
                Create a rental
                draft with complete
                property details.
              </span>
            </div>

            <ArrowRight
              aria-hidden="true"
            />
          </Link>

          <Link
            href="/post-listing/property"
            className={
              shared.quickCard
            }
          >
            <Building2
              aria-hidden="true"
            />

            <div>
              <strong>
                Post property
              </strong>

              <span>
                List land, houses
                and commercial
                spaces for sale.
              </span>
            </div>

            <ArrowRight
              aria-hidden="true"
            />
          </Link>

          <Link
            href="/dashboard/leads"
            className={
              shared.quickCard
            }
          >
            <Inbox
              aria-hidden="true"
            />

            <div>
              <strong>
                Review leads
              </strong>

              <span>
                Respond to open
                inquiries and
                inspection requests.
              </span>
            </div>

            <ArrowRight
              aria-hidden="true"
            />
          </Link>

          <Link
            href="/dashboard/listings"
            className={
              shared.quickCard
            }
          >
            <List
              aria-hidden="true"
            />

            <div>
              <strong>
                Manage inventory
              </strong>

              <span>
                Review draft,
                pending, published
                and rejected
                listings.
              </span>
            </div>

            <ArrowRight
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      <section
        className={
          styles.leadsPanel
        }
      >
        <div
          className={
            styles.sectionHeader
          }
        >
          <div>
            <span>
              Conversations
            </span>

            <h2>
              Recent incoming
              leads
            </h2>
          </div>

          <Link
            href="/dashboard/leads"
          >
            View all
          </Link>
        </div>

        {leadsLoading &&
        !leads ? (
          <div
            className={
              styles.leadLoading
            }
            role="status"
            aria-live="polite"
          >
            Loading recent
            leads{"\u2026"}
          </div>
        ) : leadsError &&
          !leads ? (
          <div
            className={
              styles.inlineError
            }
          >
            <div>
              <strong>
                Leads unavailable
              </strong>

              <span>
                {leadsError}
              </span>
            </div>

            <button
              type="button"
              className={
                styles.retryButton
              }
              disabled={
                leadsLoading
              }
              onClick={() => {
                void loadLeads();
              }}
            >
              {leadsLoading
                ? "Trying again\u2026"
                : "Try again"}
            </button>
          </div>
        ) : leads &&
          leads.length ===
            0 ? (
          <div
            className={
              styles.compactEmpty
            }
          >
            <Inbox
              aria-hidden="true"
            />

            <div>
              <strong>
                No incoming leads
                yet
              </strong>

              <span>
                New inquiries will
                appear as soon as
                users contact you.
              </span>
            </div>
          </div>
        ) : (
          <div
            className={
              styles.leadList
            }
          >
            {(leads ?? [])
              .slice(
                0,
                4,
              )
              .map(
                (lead) => (
                  <article
                    key={
                      lead.id
                    }
                    className={
                      styles.leadRow
                    }
                  >
                    <div>
                      <strong>
                        {
                          lead
                            .sender
                            .full_name
                        }
                      </strong>

                      <span>
                        {
                          lead
                            .listing
                            .title
                        }
                      </span>
                    </div>

                    <StatusBadge
                      status={
                        lead.status
                      }
                    />

                    <time
                      dateTime={
                        lead.created_at
                      }
                    >
                      {formatDate(
                        lead.created_at,
                      )}
                    </time>
                  </article>
                ),
              )}
          </div>
        )}
      </section>
    </div>
  );
}