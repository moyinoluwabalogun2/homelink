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
  Flag,
  RefreshCw,
  ShieldCheck,
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
  AdminAdvertisement,
  AdvertisementPlacement,
  AdvertisementStatus,
} from "@/types/admin";

import styles from "./page.module.css";


const PAGE_SIZE = 20;


const statusOptions: Array<{
  label: string;
  value:
    | ""
    | AdvertisementStatus;
}> = [
  {
    label: "All statuses",
    value: "",
  },
  {
    label: "Payment pending",
    value: "payment_pending",
  },
  {
    label: "Pending review",
    value: "pending_review",
  },
  {
    label: "Changes requested",
    value: "changes_requested",
  },
  {
    label: "Approved",
    value: "approved",
  },
  {
    label: "Scheduled",
    value: "scheduled",
  },
  {
    label: "Live",
    value: "live",
  },
  {
    label: "Completed",
    value: "completed",
  },
  {
    label: "Rejected",
    value: "rejected",
  },
  {
    label: "Cancelled",
    value: "cancelled",
  },
  {
    label: "Refunded",
    value: "refunded",
  },
];


const placementOptions: Array<{
  label: string;
  value:
    | ""
    | AdvertisementPlacement;
}> = [
  {
    label: "All placements",
    value: "",
  },
  {
    label: "Homepage",
    value: "homepage",
  },
  {
    label: "Discovery",
    value: "discovery",
  },
  {
    label: "Marketplace",
    value: "marketplace",
  },
  {
    label: "Listing details",
    value: "listing_detail",
  },
];


const statusLabels:
  Record<
    AdvertisementStatus,
    string
  > = {
    payment_pending:
      "Payment pending",
    pending_review:
      "Pending review",
    changes_requested:
      "Changes requested",
    approved:
      "Approved",
    scheduled:
      "Scheduled",
    live:
      "Live",
    completed:
      "Completed",
    rejected:
      "Rejected",
    cancelled:
      "Cancelled",
    refunded:
      "Refunded",
  };


const placementLabels:
  Record<
    AdvertisementPlacement,
    string
  > = {
    homepage:
      "Homepage",
    discovery:
      "Discovery",
    marketplace:
      "Marketplace",
    listing_detail:
      "Listing details",
  };


function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-NG",
  ).format(value);
}


function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not set";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return "Not set";
  }

  return parsed.toLocaleString(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}


function formatDateOnly(
  value: string | null,
): string {
  if (!value) {
    return "Not selected";
  }

  const parsed =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return "Not selected";
  }

  return parsed.toLocaleDateString(
    "en-NG",
    {
      dateStyle: "medium",
    },
  );
}


function todayValue(): string {
  const now =
    new Date();

  const localDate =
    new Date(
      now.getTime()
      -
      now.getTimezoneOffset()
      * 60_000,
    );

  return localDate
    .toISOString()
    .slice(
      0,
      10,
    );
}


function getPaymentStatus(
  advertisement:
    AdminAdvertisement,
): string {
  const payment =
    advertisement.payments[0];

  if (!payment) {
    return "No payment";
  }

  return payment.status
    .replaceAll(
      "_",
      " ",
    );
}


function getStatusClass(
  status: AdvertisementStatus,
): string {
  switch (status) {
    case "pending_review":
      return styles.statusPending;

    case "live":
      return styles.statusLive;

    case "approved":
    case "scheduled":
      return styles.statusApproved;

    case "changes_requested":
      return styles.statusChanges;

    case "rejected":
    case "cancelled":
      return styles.statusRejected;

    case "completed":
      return styles.statusCompleted;

    case "refunded":
      return styles.statusRefunded;

    default:
      return styles.statusNeutral;
  }
}


function getImageStyle(
  imageUrl: string,
): {
  backgroundImage: string;
} {
  const safeUrl =
    imageUrl.replaceAll(
      "\"",
      "%22",
    );

  return {
    backgroundImage:
      `url("${safeUrl}")`,
  };
}


export default function AdminAdvertisementsPage() {
  const [
    advertisements,
    setAdvertisements,
  ] =
    useState<
      AdminAdvertisement[]
    >([]);

  const [
    selected,
    setSelected,
  ] =
    useState<
      AdminAdvertisement | null
    >(null);

  const [
    status,
    setStatus,
  ] =
    useState<
      "" | AdvertisementStatus
    >("pending_review");

  const [
    placement,
    setPlacement,
  ] =
    useState<
      "" | AdvertisementPlacement
    >("");

  const [
    offset,
    setOffset,
  ] =
    useState(0);

  const [
    total,
    setTotal,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    actionError,
    setActionError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const [
    action,
    setAction,
  ] =
    useState<
      | ""
      | "approve"
      | "changes"
      | "reject"
      | "cancel"
    >("");

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    reviewNotes,
    setReviewNotes,
  ] =
    useState("");

  const [
    goLiveNow,
    setGoLiveNow,
  ] =
    useState(true);

  const [
    scheduledStartDate,
    setScheduledStartDate,
  ] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);


  const clearReview =
    useCallback(
      () => {
        setSelected(null);
        setAction("");
        setReason("");
        setReviewNotes("");
        setActionError("");
        setSuccess("");
      },
      [],
    );


  const loadAdvertisements =
    useCallback(
      async (
        background = false,
      ) => {
        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const response =
            await adminService
              .listAdvertisements({
                status:
                  status || undefined,
                placement:
                  placement
                  || undefined,
                limit:
                  PAGE_SIZE,
                offset,
              });

          setAdvertisements(
            response.items,
          );

          setTotal(
            response.total,
          );

          setSelected(
            (
              current,
            ) => {
              if (!current) {
                return null;
              }

              return (
                response.items.find(
                  (item) =>
                    item.id
                    === current.id,
                )
                ?? current
              );
            },
          );

        } catch (requestError) {
          setError(
            getApiErrorMessage(
              requestError,
              "Advertisements could not be loaded.",
            ),
          );

        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        offset,
        placement,
        status,
      ],
    );


  useEffect(() => {
    void loadAdvertisements();
  }, [
    loadAdvertisements,
  ]);


  function openReview(
    advertisement:
      AdminAdvertisement,
  ): void {
    setSelected(
      advertisement,
    );

    setAction("");
    setReason("");

    setReviewNotes(
      advertisement.review_notes
      ?? "",
    );

    setGoLiveNow(true);

    setScheduledStartDate(
      advertisement
        .preferred_start_date
      ?? "",
    );

    setActionError("");
    setSuccess("");
  }


  function chooseAction(
    nextAction:
      | "approve"
      | "changes"
      | "reject"
      | "cancel",
  ): void {
    setAction(
      nextAction,
    );

    setReason("");
    setActionError("");
    setSuccess("");
  }


  async function submitAction():
    Promise<void> {
    if (
      !selected
      || !action
    ) {
      return;
    }

    if (
      action !== "approve"
      &&
      reason.trim().length < 5
    ) {
      setActionError(
        "Enter a clear moderation reason of at least five characters.",
      );

      return;
    }

    if (
      action === "approve"
      &&
      !goLiveNow
      &&
      !scheduledStartDate
    ) {
      setActionError(
        "Choose a scheduled start date.",
      );

      return;
    }

    setSubmitting(true);
    setActionError("");
    setSuccess("");

    try {
      let updated:
        AdminAdvertisement;

      if (
        action === "approve"
      ) {
        updated =
          await adminService
            .approveAdvertisement(
              selected.id,
              {
                go_live_now:
                  goLiveNow,
                scheduled_start_date:
                  goLiveNow
                    ? null
                    : scheduledStartDate,
                review_notes:
                  reviewNotes.trim()
                  || null,
              },
            );

      } else if (
        action === "changes"
      ) {
        updated =
          await adminService
            .requestAdvertisementChanges(
              selected.id,
              reason.trim(),
            );

      } else if (
        action === "reject"
      ) {
        updated =
          await adminService
            .rejectAdvertisement(
              selected.id,
              reason.trim(),
            );

      } else {
        updated =
          await adminService
            .cancelAdvertisement(
              selected.id,
              reason.trim(),
            );
      }

      setSelected(updated);

      setAdvertisements(
        (
          current,
        ) =>
          current.map(
            (advertisement) =>
              advertisement.id
              === updated.id
                ? updated
                : advertisement,
          ),
      );

      setAction("");
      setReason("");

      setSuccess(
        "The advertisement was updated successfully.",
      );

      await loadAdvertisements(
        true,
      );

    } catch (requestError) {
      setActionError(
        getApiErrorMessage(
          requestError,
          "The moderation action could not be completed.",
        ),
      );

    } finally {
      setSubmitting(false);
    }
  }


  const currentPage =
    Math.floor(
      offset / PAGE_SIZE,
    ) + 1;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total / PAGE_SIZE,
      ),
    );

  const canGoBack =
    offset > 0;

  const canGoForward =
    offset + PAGE_SIZE
    < total;

  const canModeratePending =
    selected?.status
    === "pending_review";

  const canCancel =
    selected
      ? [
          "approved",
          "scheduled",
          "live",
        ].includes(
          selected.status,
        )
      : false;


  return (
    <div
      className={
        `${shared.page} ${styles.page}`
      }
    >
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

            Sponsored advertising
          </span>

          <h1>
            Campaign moderation
          </h1>

          <p>
            Review paid HomeLink
            advertisements, verify their
            content and decide exactly
            when approved campaigns
            should become visible.
          </p>
        </div>

        <Link
          href="/admin"
          className={
            styles.backLink
          }
        >
          Admin overview

          <ArrowRight
            aria-hidden="true"
          />
        </Link>
      </header>


      <section
        className={
          styles.summaryStrip
        }
        aria-label={
          "Advertisement queue summary"
        }
      >
        <div>
          <span>
            Matching campaigns
          </span>

          <strong>
            {formatNumber(total)}
          </strong>
        </div>

        <div>
          <span>
            Current page
          </span>

          <strong>
            {currentPage}
          </strong>
        </div>

        <div>
          <span>
            Total pages
          </span>

          <strong>
            {totalPages}
          </strong>
        </div>

        <div>
          <span>
            Package
          </span>

          <strong>
            ₦5,000
          </strong>
        </div>
      </section>


      <section
        className={
          styles.filters
        }
        aria-label={
          "Advertisement filters"
        }
      >
        <div
          className={
            styles.filterHeading
          }
        >
          <div>
            <span>
              Moderation queue
            </span>

            <h2>
              Review campaigns
            </h2>
          </div>

          <button
            type="button"
            disabled={
              refreshing
            }
            onClick={() => {
              void loadAdvertisements(
                true,
              );
            }}
          >
            <RefreshCw
              aria-hidden="true"
            />

            {refreshing
              ? "Refreshing"
              : "Refresh"}
          </button>
        </div>


        <div
          className={
            styles.filterControls
          }
        >
          <label>
            <span>
              Status
            </span>

            <select
              value={status}
              onChange={(
                event,
              ) => {
                const nextStatus =
                  event.currentTarget
                    .value as
                    | ""
                    | AdvertisementStatus;

                setStatus(
                  nextStatus,
                );

                setOffset(0);
                clearReview();
              }}
            >
              {statusOptions.map(
                (option) => (
                  <option
                    key={
                      option.value
                      || "all"
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                ),
              )}
            </select>
          </label>


          <label>
            <span>
              Placement
            </span>

            <select
              value={placement}
              onChange={(
                event,
              ) => {
                const nextPlacement =
                  event.currentTarget
                    .value as
                    | ""
                    | AdvertisementPlacement;

                setPlacement(
                  nextPlacement,
                );

                setOffset(0);
                clearReview();
              }}
            >
              {placementOptions.map(
                (option) => (
                  <option
                    key={
                      option.value
                      || "all"
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                ),
              )}
            </select>
          </label>
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
              Queue unavailable
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadAdvertisements();
            }}
          >
            Try again
          </button>
        </div>
      ) : null}


      <div
        className={
          styles.workspace
        }
      >
        <section
          className={
            styles.campaignList
          }
          aria-label={
            "Advertisement campaigns"
          }
        >
          {loading ? (
            Array.from(
              {
                length: 5,
              },
              (
                _,
                index,
              ) => (
                <div
                  key={index}
                  className={
                    styles.skeleton
                  }
                />
              ),
            )
          ) : advertisements.length
            === 0 ? (
              <div
                className={
                  styles.emptyState
                }
              >
                <Flag
                  aria-hidden="true"
                />

                <h2>
                  Nothing in this queue
                </h2>

                <p>
                  No advertisements match
                  the selected status and
                  placement filters.
                </p>
              </div>
            ) : (
              advertisements.map(
                (
                  advertisement,
                ) => (
                  <article
                    key={
                      advertisement.id
                    }
                    className={
                      selected?.id
                      === advertisement.id
                        ? `${styles.campaignCard} ${styles.campaignSelected}`
                        : styles.campaignCard
                    }
                  >
                    <div
                      className={
                        styles.image
                      }
                      style={
                        getImageStyle(
                          advertisement
                            .image_url,
                        )
                      }
                      role="img"
                      aria-label={
                        `${advertisement.business_name} advertisement`
                      }
                    />

                    <div
                      className={
                        styles.campaignBody
                      }
                    >
                      <div
                        className={
                          styles.cardTop
                        }
                      >
                        <span
                          className={
                            `${styles.status} ${getStatusClass(
                              advertisement.status,
                            )}`
                          }
                        >
                          {
                            statusLabels[
                              advertisement
                                .status
                            ]
                          }
                        </span>

                        <span
                          className={
                            styles.reference
                          }
                        >
                          {
                            advertisement
                              .reference
                          }
                        </span>
                      </div>

                      <span
                        className={
                          styles.businessName
                        }
                      >
                        {
                          advertisement
                            .business_name
                        }
                      </span>

                      <h2>
                        {
                          advertisement
                            .headline
                        }
                      </h2>

                      <p>
                        {
                          advertisement
                            .description
                        }
                      </p>

                      <div
                        className={
                          styles.cardMeta
                        }
                      >
                        <span>
                          {
                            placementLabels[
                              advertisement
                                .placement
                            ]
                          }
                        </span>

                        <span>
                          {formatCurrency(
                            advertisement
                              .amount_kobo
                            / 100,
                          )}
                        </span>

                        <span>
                          {
                            advertisement
                              .duration_days
                          }{" "}
                          days
                        </span>

                        <span>
                          {getPaymentStatus(
                            advertisement,
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        className={
                          styles.reviewButton
                        }
                        onClick={() => {
                          openReview(
                            advertisement,
                          );
                        }}
                      >
                        Review campaign

                        <ArrowRight
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </article>
                ),
              )
            )}


          {!loading
          && total > 0 ? (
            <nav
              className={
                styles.pagination
              }
              aria-label={
                "Advertisement pagination"
              }
            >
              <button
                type="button"
                disabled={
                  !canGoBack
                }
                onClick={() => {
                  setOffset(
                    Math.max(
                      0,
                      offset
                      - PAGE_SIZE,
                    ),
                  );

                  clearReview();
                }}
              >
                Previous
              </button>

              <span>
                Page {currentPage} of{" "}
                {totalPages}
              </span>

              <button
                type="button"
                disabled={
                  !canGoForward
                }
                onClick={() => {
                  setOffset(
                    offset
                    + PAGE_SIZE,
                  );

                  clearReview();
                }}
              >
                Next
              </button>
            </nav>
          ) : null}
        </section>


        <aside
          className={
            styles.reviewPanel
          }
        >
          {!selected ? (
            <div
              className={
                styles.reviewPlaceholder
              }
            >
              <CircleDollarSign
                aria-hidden="true"
              />

              <span>
                Campaign review
              </span>

              <h2>
                Select an advertisement
              </h2>

              <p>
                Choose a campaign from
                the queue to inspect its
                payment, destination,
                schedule and moderation
                options.
              </p>
            </div>
          ) : (
            <>
              <div
                className={
                  styles.reviewHeader
                }
              >
                <div>
                  <span>
                    Review campaign
                  </span>

                  <h2>
                    {
                      selected
                        .business_name
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    clearReview
                  }
                  aria-label={
                    "Close campaign review"
                  }
                >
                  Close
                </button>
              </div>


              <div
                className={
                  styles.reviewImage
                }
                style={
                  getImageStyle(
                    selected.image_url,
                  )
                }
                role="img"
                aria-label={
                  `${selected.business_name} advertisement preview`
                }
              />


              <div
                className={
                  styles.reviewCopy
                }
              >
                <span
                  className={
                    `${styles.status} ${getStatusClass(
                      selected.status,
                    )}`
                  }
                >
                  {
                    statusLabels[
                      selected.status
                    ]
                  }
                </span>

                <h3>
                  {selected.headline}
                </h3>

                <p>
                  {
                    selected.description
                  }
                </p>

                <a
                  href={
                    selected.destination_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open destination

                  <ArrowRight
                    aria-hidden="true"
                  />
                </a>
              </div>


              <dl
                className={
                  styles.details
                }
              >
                <div>
                  <dt>
                    Placement
                  </dt>

                  <dd>
                    {
                      placementLabels[
                        selected
                          .placement
                      ]
                    }
                  </dd>
                </div>

                <div>
                  <dt>
                    Package value
                  </dt>

                  <dd>
                    {formatCurrency(
                      selected
                        .amount_kobo
                      / 100,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Payment
                  </dt>

                  <dd>
                    {getPaymentStatus(
                      selected,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Duration
                  </dt>

                  <dd>
                    {
                      selected
                        .duration_days
                    }{" "}
                    days
                  </dd>
                </div>

                <div>
                  <dt>
                    Preferred date
                  </dt>

                  <dd>
                    {formatDateOnly(
                      selected
                        .preferred_start_date,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Starts
                  </dt>

                  <dd>
                    {formatDate(
                      selected.starts_at,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Ends
                  </dt>

                  <dd>
                    {formatDate(
                      selected.ends_at,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Submitted
                  </dt>

                  <dd>
                    {formatDate(
                      selected.created_at,
                    )}
                  </dd>
                </div>
              </dl>


              <div
                className={
                  styles.contact
                }
              >
                <span>
                  Advertiser contact
                </span>

                <a
                  href={
                    `mailto:${selected.contact_email}`
                  }
                >
                  {
                    selected
                      .contact_email
                  }
                </a>

                {selected.contact_phone ? (
                  <a
                    href={
                      `tel:${selected.contact_phone}`
                    }
                  >
                    {
                      selected
                        .contact_phone
                    }
                  </a>
                ) : null}
              </div>


              <div
                className={
                  styles.performance
                }
              >
                <div>
                  <Activity
                    aria-hidden="true"
                  />

                  <span>
                    Impressions
                  </span>

                  <strong>
                    {formatNumber(
                      selected
                        .impression_count,
                    )}
                  </strong>
                </div>

                <div>
                  <ArrowRight
                    aria-hidden="true"
                  />

                  <span>
                    Clicks
                  </span>

                  <strong>
                    {formatNumber(
                      selected
                        .click_count,
                    )}
                  </strong>
                </div>
              </div>


              {selected.review_notes ? (
                <div
                  className={
                    styles.existingNote
                  }
                >
                  <strong>
                    Review notes
                  </strong>

                  <p>
                    {
                      selected
                        .review_notes
                    }
                  </p>
                </div>
              ) : null}


              {selected.rejection_reason ? (
                <div
                  className={
                    styles.rejectionNote
                  }
                >
                  <strong>
                    Moderation reason
                  </strong>

                  <p>
                    {
                      selected
                        .rejection_reason
                    }
                  </p>
                </div>
              ) : null}


              <section
                className={
                  styles.actions
                }
              >
                <div
                  className={
                    styles.actionsHeading
                  }
                >
                  <span>
                    Decision
                  </span>

                  <h3>
                    Moderation action
                  </h3>
                </div>


                <div
                  className={
                    styles.actionTabs
                  }
                >
                  {canModeratePending ? (
                    <>
                      <button
                        type="button"
                        className={
                          action
                          === "approve"
                            ? styles.activeAction
                            : undefined
                        }
                        onClick={() => {
                          chooseAction(
                            "approve",
                          );
                        }}
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        className={
                          action
                          === "changes"
                            ? styles.activeAction
                            : undefined
                        }
                        onClick={() => {
                          chooseAction(
                            "changes",
                          );
                        }}
                      >
                        Request changes
                      </button>

                      <button
                        type="button"
                        className={
                          action
                          === "reject"
                            ? styles.dangerAction
                            : undefined
                        }
                        onClick={() => {
                          chooseAction(
                            "reject",
                          );
                        }}
                      >
                        Reject
                      </button>
                    </>
                  ) : null}


                  {canCancel ? (
                    <button
                      type="button"
                      className={
                        action
                        === "cancel"
                          ? styles.dangerAction
                          : undefined
                      }
                      onClick={() => {
                        chooseAction(
                          "cancel",
                        );
                      }}
                    >
                      Cancel campaign
                    </button>
                  ) : null}
                </div>


                {action === "approve" ? (
                  <div
                    className={
                      styles.actionForm
                    }
                  >
                    <fieldset>
                      <legend>
                        Campaign start
                      </legend>

                      <label
                        className={
                          styles.radio
                        }
                      >
                        <input
                          type="radio"
                          name="campaign-start"
                          checked={
                            goLiveNow
                          }
                          onChange={() => {
                            setGoLiveNow(
                              true,
                            );
                          }}
                        />

                        <span>
                          Go live immediately
                        </span>
                      </label>

                      <label
                        className={
                          styles.radio
                        }
                      >
                        <input
                          type="radio"
                          name="campaign-start"
                          checked={
                            !goLiveNow
                          }
                          onChange={() => {
                            setGoLiveNow(
                              false,
                            );
                          }}
                        />

                        <span>
                          Schedule a date
                        </span>
                      </label>
                    </fieldset>


                    {!goLiveNow ? (
                      <label>
                        <span>
                          Scheduled start date
                        </span>

                        <input
                          type="date"
                          min={
                            todayValue()
                          }
                          value={
                            scheduledStartDate
                          }
                          onChange={(
                            event,
                          ) => {
                            setScheduledStartDate(
                              event
                                .currentTarget
                                .value,
                            );
                          }}
                        />
                      </label>
                    ) : null}


                    <label>
                      <span>
                        Internal review notes
                      </span>

                      <textarea
                        value={
                          reviewNotes
                        }
                        maxLength={1000}
                        rows={4}
                        placeholder={
                          "Optional notes about the approval decision."
                        }
                        onChange={(
                          event,
                        ) => {
                          setReviewNotes(
                            event
                              .currentTarget
                              .value,
                          );
                        }}
                      />
                    </label>
                  </div>
                ) : null}


                {action
                && action !== "approve" ? (
                  <div
                    className={
                      styles.actionForm
                    }
                  >
                    <label>
                      <span>
                        Moderation reason
                      </span>

                      <textarea
                        value={reason}
                        minLength={5}
                        maxLength={1000}
                        rows={5}
                        placeholder={
                          action
                          === "changes"
                            ? "Explain exactly what the advertiser must correct."
                            : "Record the reason for this decision."
                        }
                        onChange={(
                          event,
                        ) => {
                          setReason(
                            event
                              .currentTarget
                              .value,
                          );
                        }}
                      />
                    </label>
                  </div>
                ) : null}


                {actionError ? (
                  <p
                    className={
                      styles.actionError
                    }
                    role="alert"
                  >
                    {actionError}
                  </p>
                ) : null}


                {success ? (
                  <p
                    className={
                      styles.success
                    }
                    role="status"
                  >
                    <CheckSquare
                      aria-hidden="true"
                    />

                    {success}
                  </p>
                ) : null}


                {action ? (
                  <button
                    type="button"
                    className={
                      action === "reject"
                      || action === "cancel"
                        ? styles.submitDanger
                        : styles.submitAction
                    }
                    disabled={
                      submitting
                    }
                    onClick={() => {
                      void submitAction();
                    }}
                  >
                    {submitting
                      ? "Saving decision"
                      : "Confirm decision"}
                  </button>
                ) : null}
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}