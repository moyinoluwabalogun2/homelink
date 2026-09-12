"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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


  /* =========================================================
     LOAD PROFILE
  ========================================================= */

  const loadProfile =
    useCallback(
      async () => {
        setProfileLoading(
          true,
        );

        setProfileError(
          "",
        );

        try {
          const result =
            await agentService
              .getMine();

          setProfile(
            result,
          );

          if (!result) {
            setProfileError(
              "HomeLink could not find your agent profile.",
            );
          }

        } catch (
          error
        ) {
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
          setProfileLoading(
            false,
          );
        }
      },
      [],
    );


  /* =========================================================
     LOAD SUMMARY

     Do not force the request during the initial load.

     DashboardShell also asks dashboardService for the summary.
     The service already has an in-flight request deduper/cache,
     so both consumers can share the same request.
  ========================================================= */

  const loadSummary =
    useCallback(
      async () => {
        setSummaryLoading(
          true,
        );

        setSummaryError(
          "",
        );

        try {
          const result =
            await dashboardService
              .getSummary();

          setSummary(
            result,
          );

        } catch (
          error
        ) {
          setSummaryError(
            getApiErrorMessage(
              error,
              "Your dashboard summary could not be loaded.",
            ),
          );

        } finally {
          setSummaryLoading(
            false,
          );
        }
      },
      [],
    );


  /* =========================================================
     LOAD INCOMING LEADS
  ========================================================= */

  const loadLeads =
    useCallback(
      async () => {
        setLeadsLoading(
          true,
        );

        setLeadsError(
          "",
        );

        try {
          const result =
            await engagementService
              .listReceivedInquiries();

          setLeads(
            result,
          );

        } catch (
          error
        ) {
          setLeadsError(
            getApiErrorMessage(
              error,
              "Incoming leads could not be loaded.",
            ),
          );

        } finally {
          setLeadsLoading(
            false,
          );
        }
      },
      [],
    );


  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(
    () => {
      void loadProfile();
      void loadSummary();
      void loadLeads();
    },
    [
      loadProfile,
      loadSummary,
      loadLeads,
    ],
  );


  /* =========================================================
     DERIVED VALUES
  ========================================================= */

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
          (
            lead,
          ) =>
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


  /* =========================================================
     RENDER
  ========================================================= */

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
                ? "…"
                : summaryError &&
                    !summary
                  ? "—"
                  : publishedListings ??
                    "—"}
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
                ? "…"
                : leadsError &&
                    !leads
                  ? "—"
                  : openLeads ??
                    "—"}
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
                ? "…"
                : summaryError &&
                    !summary
                  ? "—"
                  : summary
                      ?.received_inquiries ??
                    "—"}
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
                ? "…"
                : profileError &&
                    !profile
                  ? "—"
                  : profile
                      ?.years_experience ??
                    "—"}
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
              onClick={() => {
                void loadSummary();
              }}
              className={
                styles.retryButton
              }
            >
              Try again
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
                onClick={() => {
                  void loadProfile();
                }}
              >
                Try again
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
                onClick={() => {
                  void loadSummary();
                }}
              >
                Try again
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
                (
                  credit,
                ) => {
                  const total =
                    credit
                      .free_remaining +
                    credit
                      .paid_remaining;

                  return (
                    <div
                      key={
                        credit.credit_type
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
                          free ·{" "}
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
          >
            Loading recent leads…
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
              onClick={() => {
                void loadLeads();
              }}
              className={
                styles.retryButton
              }
            >
              Try again
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
                (
                  lead,
                ) => (
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

                    <time>
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