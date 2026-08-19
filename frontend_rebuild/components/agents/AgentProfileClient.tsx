"use client";

import {
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Loader2,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatDate,
  initials,
  titleCase,
} from "@/lib/formatters";

import {
  agentService,
} from "@/services/agent-service";

import type {
  AgentProfile,
} from "@/types/agent";

import styles from "./AgentProfileClient.module.css";


export default function AgentProfileClient({
  profileId,
}: {
  profileId: string;
}) {
  const [
    profile,
    setProfile,
  ] =
    useState<AgentProfile | null>(
      null,
    );

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
     LOAD PROFILE
  ========================================================= */

  useEffect(() => {
    let active = true;

    agentService
      .getById(profileId)
      .then((record) => {
        if (active) {
          setProfile(record);
          setError(null);
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
              "This profile could not be found.",
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
  }, [profileId]);


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
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
          Loading profile…
        </span>
      </div>
    );
  }


  /* =========================================================
     ERROR
  ========================================================= */

  if (
    error ||
    !profile
  ) {
    return (
      <div
        className={
          styles.state
        }
      >
        <ShieldCheck
          aria-hidden="true"
        />

        <span
          className={
            styles.stateLabel
          }
        >
          HomeLink professionals
        </span>

        <h1>
          Profile unavailable
        </h1>

        <p>
          {error ??
            "This profile is not currently available."}
        </p>

        <Link href="/agents">
          Back to agents
        </Link>
      </div>
    );
  }


  const displayName =
    profile.business_name ??
    profile.user.full_name;


  const experienceLabel =
    `${profile.years_experience} ${
      profile.years_experience ===
      1
        ? "year"
        : "years"
    }`;


  return (
    <div
      className={
        styles.page
      }
    >
      {/* =====================================================
          TOP NAV
      ====================================================== */}

      <div
        className={
          styles.topbar
        }
      >
        <Link
          href="/agents"
          className={
            styles.back
          }
        >
          <ArrowLeft
            aria-hidden="true"
          />

          Back to agents
        </Link>

        <span>
          Approved professional
        </span>
      </div>


      {/* =====================================================
          PROFILE HERO
      ====================================================== */}

      <section
        className={
          styles.profileHero
        }
      >
        <div
          className={
            styles.heroIdentity
          }
        >
          <span
            className={
              styles.avatar
            }
          >
            {profile.user
              .profile_image_url ? (
              <Image
                src={
                  profile.user
                    .profile_image_url
                }
                alt={`${profile.user.full_name} profile`}
                width={160}
                height={160}
                sizes="120px"
              />
            ) : (
              initials(
                profile.user
                  .full_name,
              )
            )}
          </span>


          <div
            className={
              styles.identity
            }
          >
            <div
              className={
                styles.approvalLine
              }
            >
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

              <span
                className={
                  styles.agentType
                }
              >
                {titleCase(
                  profile.agent_type,
                )}
              </span>
            </div>


            <h1>
              {displayName}
            </h1>


            {profile.business_name ? (
              <p
                className={
                  styles.personalName
                }
              >
                {
                  profile.user
                    .full_name
                }
              </p>
            ) : null}
          </div>
        </div>


        <div
          className={
            styles.heroSummary
          }
        >
          <div>
            <span>
              Experience
            </span>

            <strong>
              {experienceLabel}
            </strong>
          </div>


          <div>
            <span>
              Coverage
            </span>

            <strong>
              {profile
                .coverage_areas
                .length || "—"}{" "}
              {profile
                .coverage_areas
                .length === 1
                ? "area"
                : "areas"}
            </strong>
          </div>


          <div>
            <span>
              Status
            </span>

            <strong>
              Approved
            </strong>
          </div>
        </div>
      </section>


      {/* =====================================================
          BODY
      ====================================================== */}

      <div
        className={
          styles.layout
        }
      >
        <main
          className={
            styles.mainContent
          }
        >
          {/* ===============================================
              ABOUT
          ================================================ */}

          <section
            className={
              styles.section
            }
          >
            <div
              className={
                styles.sectionLabel
              }
            >
              <span>
                01
              </span>

              <h2>
                About
              </h2>
            </div>


            <div
              className={
                styles.sectionContent
              }
            >
              <p
                className={
                  styles.bio
                }
              >
                {profile.bio ||
                  "This approved professional has not added a public bio yet."}
              </p>
            </div>
          </section>


          {/* ===============================================
              COVERAGE
          ================================================ */}

          <section
            className={
              styles.section
            }
          >
            <div
              className={
                styles.sectionLabel
              }
            >
              <span>
                02
              </span>

              <h2>
                Coverage areas
              </h2>
            </div>


            <div
              className={
                styles.sectionContent
              }
            >
              {profile
                .coverage_areas
                .length ? (
                <div
                  className={
                    styles.areas
                  }
                >
                  {profile.coverage_areas.map(
                    (
                      record,
                    ) => (
                      <div
                        key={
                          record.area
                            .id
                        }
                        className={
                          styles.areaRow
                        }
                      >
                        <span
                          className={
                            styles.areaIcon
                          }
                        >
                          <MapPin
                            aria-hidden="true"
                          />
                        </span>

                        <div>
                          <span>
                            Area
                          </span>

                          <strong>
                            {
                              record.area
                                .name
                            }
                          </strong>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p
                  className={
                    styles.emptyText
                  }
                >
                  No public
                  coverage areas
                  have been added
                  yet.
                </p>
              )}
            </div>
          </section>


          {/* ===============================================
              PROFESSIONAL INFO
          ================================================ */}

          <section
            className={
              styles.section
            }
          >
            <div
              className={
                styles.sectionLabel
              }
            >
              <span>
                03
              </span>

              <h2>
                Professional info
              </h2>
            </div>


            <div
              className={
                styles.sectionContent
              }
            >
              <div
                className={
                  styles.infoGrid
                }
              >
                <div>
                  <Briefcase
                    aria-hidden="true"
                  />

                  <span>
                    Experience
                  </span>

                  <strong>
                    {
                      experienceLabel
                    }
                  </strong>
                </div>


                <div>
                  <BadgeCheck
                    aria-hidden="true"
                  />

                  <span>
                    Profile type
                  </span>

                  <strong>
                    {titleCase(
                      profile.agent_type,
                    )}
                  </strong>
                </div>


                <div>
                  <ShieldCheck
                    aria-hidden="true"
                  />

                  <span>
                    Approved
                  </span>

                  <strong>
                    {formatDate(
                      profile.approved_at,
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        </main>


        {/* ===================================================
            TRUST SIDEBAR
        ==================================================== */}

        <aside
          className={
            styles.sidebar
          }
        >
          <div
            className={
              styles.trustBlock
            }
          >
            <span
              className={
                styles.trustIcon
              }
            >
              <ShieldCheck
                aria-hidden="true"
              />
            </span>

            <span
              className={
                styles.trustEyebrow
              }
            >
              HomeLink review
            </span>

            <h2>
              Approved profile.
            </h2>

            <p>
              This profile has
              completed HomeLink&apos;s
              professional
              application review
              before appearing in
              the public directory.
            </p>
          </div>


          <div
            className={
              styles.safetyBlock
            }
          >
            <span>
              Before making payment
            </span>

            <p>
              Always inspect a
              property, confirm
              relevant documents
              and keep important
              arrangements
              documented.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}