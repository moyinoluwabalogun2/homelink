"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  initials,
  titleCase,
} from "@/lib/formatters";

import {
  agentService,
} from "@/services/agent-service";

import type {
  AgentProfile,
} from "@/types/agent";

import styles from "./AgentDirectory.module.css";


export default function AgentDirectory() {
  const [
    agents,
    setAgents,
  ] =
    useState<AgentProfile[]>(
      [],
    );

  const [
    query,
    setQuery,
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
    useState<string | null>(
      null,
    );


  /* =========================================================
     LOAD APPROVED AGENTS
  ========================================================= */

  useEffect(() => {
    let active = true;

    agentService
      .listApproved()
      .then((records) => {
        if (active) {
          setAgents(records);
        }
      })
      .catch(
        (
          requestError,
        ) => {
          if (!active) {
            return;
          }

          setError(
            getApiErrorMessage(
              requestError,
              "Agents could not be loaded.",
            ),
          );
        },
      )
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);


  /* =========================================================
     SEARCH
  ========================================================= */

  const visibleAgents =
    useMemo(() => {
      const term =
        query
          .trim()
          .toLowerCase();

      if (!term) {
        return agents;
      }

      return agents.filter(
        (agent) =>
          [
            agent.user.full_name,
            agent.business_name ??
              "",
            agent.agent_type,

            ...agent.coverage_areas.map(
              (record) =>
                record.area.name,
            ),
          ]
            .join(" ")
            .toLowerCase()
            .includes(term),
      );
    }, [
      agents,
      query,
    ]);


  return (
    <div
      className={
        styles.page
      }
    >
      {/* ===================================================
          HERO
      ==================================================== */}

      <section
        className={
          styles.hero
        }
      >
        <div
          className={
            styles.heroInner
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
              Approved professionals
            </span>

            <h1>
              Find people who
              know the area.
            </h1>

            <p>
              Explore approved
              agents and landlords,
              see where they work
              and understand their
              experience before
              reaching out.
            </p>
          </div>


          <div
            className={
              styles.heroTrust
            }
          >
            <span
              className={
                styles.heroTrustIcon
              }
            >
              <ShieldCheck
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                Reviewed profiles
              </strong>

              <p>
                Approved profiles
                have completed
                HomeLink&apos;s
                application review
                before appearing
                here.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ===================================================
          DIRECTORY
      ==================================================== */}

      <section
        className={
          styles.content
        }
      >
        <div
          className={
            styles.directoryIntro
          }
        >
          <div>
            <span>
              Directory
            </span>

            <h2>
              Professionals serving
              OOU communities.
            </h2>
          </div>

          <p>
            Search by name,
            business or coverage
            area.
          </p>
        </div>


        {/* ===============================================
            SEARCH TOOLBAR
        ================================================ */}

        <div
          className={
            styles.toolbar
          }
        >
          <label
            className={
              styles.searchField
            }
          >
            <Search
              aria-hidden="true"
            />

            <input
              value={
                query
              }
              onChange={(
                event,
              ) =>
                setQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search by name, business or area"
              aria-label="Search approved agents"
            />
          </label>


          <span
            className={
              styles.resultCount
            }
          >
            {loading
              ? "Loading profiles"
              : `${visibleAgents.length} approved ${
                  visibleAgents.length ===
                  1
                    ? "profile"
                    : "profiles"
                }`}
          </span>
        </div>


        {/* ===============================================
            STATES
        ================================================ */}

        {loading ? (
          <div
            className={
              styles.state
            }
          >
            <Loader2
              className={
                styles.spinner
              }
              aria-hidden="true"
            />

            <span>
              Loading approved
              professionals…
            </span>
          </div>
        ) : error ? (
          <div
            className={
              styles.state
            }
          >
            <ShieldCheck
              aria-hidden="true"
            />

            <h2>
              We couldn&apos;t load
              the directory.
            </h2>

            <p>
              {error}
            </p>
          </div>
        ) : visibleAgents.length ===
          0 ? (
          <div
            className={
              styles.state
            }
          >
            <Briefcase
              aria-hidden="true"
            />

            <h2>
              No matching
              profiles.
            </h2>

            <p>
              Try another name,
              business or area.
            </p>
          </div>
        ) : (
          /* =============================================
             AGENT GRID
          ============================================== */

          <div
            className={
              styles.grid
            }
          >
            {visibleAgents.map(
              (agent) => {
                const coverage =
                  agent.coverage_areas
                    .slice(
                      0,
                      3,
                    )
                    .map(
                      (item) =>
                        item.area.name,
                    )
                    .join(", ");


                const displayName =
                  agent.business_name ??
                  agent.user
                    .full_name;


                return (
                  <article
                    key={
                      agent.id
                    }
                    className={
                      styles.card
                    }
                  >
                    <div
                      className={
                        styles.cardHeader
                      }
                    >
                      <span
                        className={
                          styles.avatar
                        }
                      >
                        {agent.user
                          .profile_image_url ? (
                          <Image
                            src={
                              agent.user
                                .profile_image_url
                            }
                            alt={`${agent.user.full_name} profile`}
                            width={96}
                            height={96}
                            sizes="72px"
                          />
                        ) : (
                          initials(
                            agent.user
                              .full_name,
                          )
                        )}
                      </span>


                      <span
                        className={
                          styles.approved
                        }
                      >
                        <BadgeCheck
                          aria-hidden="true"
                        />

                        Approved
                      </span>
                    </div>


                    <div
                      className={
                        styles.identity
                      }
                    >
                      <span>
                        {titleCase(
                          agent.agent_type,
                        )}
                      </span>

                      <h3>
                        {
                          displayName
                        }
                      </h3>

                      {agent.business_name ? (
                        <p>
                          {
                            agent.user
                              .full_name
                          }
                        </p>
                      ) : null}
                    </div>


                    {agent.bio ? (
                      <p
                        className={
                          styles.bio
                        }
                      >
                        {agent.bio}
                      </p>
                    ) : (
                      <p
                        className={
                          styles.bio
                        }
                      >
                        Approved
                        professional
                        serving HomeLink
                        communities.
                      </p>
                    )}


                    <div
                      className={
                        styles.meta
                      }
                    >
                      <div>
                        <Briefcase
                          aria-hidden="true"
                        />

                        <span>
                          <small>
                            Experience
                          </small>

                          <strong>
                            {
                              agent.years_experience
                            }{" "}
                            {agent.years_experience ===
                            1
                              ? "year"
                              : "years"}
                          </strong>
                        </span>
                      </div>


                      <div>
                        <MapPin
                          aria-hidden="true"
                        />

                        <span>
                          <small>
                            Coverage
                          </small>

                          <strong>
                            {coverage ||
                              "OOU communities"}
                          </strong>
                        </span>
                      </div>
                    </div>


                    <Link
                      href={`/agents/${agent.id}`}
                    >
                      <span>
                        View profile
                      </span>

                      <ArrowRight
                        aria-hidden="true"
                      />
                    </Link>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>
    </div>
  );
}