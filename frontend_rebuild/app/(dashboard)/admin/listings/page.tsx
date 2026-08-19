"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileImage,
  MapPin,
  Play,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import DecisionDialog from "@/components/admin/DecisionDialog";
import shared from "@/components/dashboard/DashboardPage.module.css";
import StatusBadge from "@/components/dashboard/StatusBadge";

import { getApiErrorMessage } from "@/lib/api-errors";
import {
  formatCurrency,
  formatDate,
  titleCase,
} from "@/lib/formatters";

import { adminService } from "@/services/admin-service";

import type {
  Listing,
  ListingMedia,
} from "@/types/listing";

import styles from "./page.module.css";


function getCoverMedia(listing: Listing): ListingMedia | null {
  return (
    listing.media.find((media) => media.is_cover) ??
    listing.media[0] ??
    null
  );
}


function getListingFacts(
  listing: Listing,
): Array<{ label: string; value: string }> {
  if (listing.listing_type === "rental" && listing.rental_details) {
    const details = listing.rental_details;

    return [
      {
        label: "Category",
        value: titleCase(details.category),
      },
      {
        label: "Rent period",
        value: titleCase(details.rent_period),
      },
      {
        label: "Bedrooms",
        value:
          details.bedrooms === null
            ? "Not stated"
            : String(details.bedrooms),
      },
      {
        label: "Bathrooms",
        value:
          details.bathrooms === null
            ? "Not stated"
            : String(details.bathrooms),
      },
      {
        label: "Furnished",
        value: details.is_furnished ? "Yes" : "No",
      },
      {
        label: "Address",
        value: details.address,
      },
    ];
  }

  if (
    listing.listing_type === "buy_property" &&
    listing.buy_property_details
  ) {
    const details = listing.buy_property_details;

    return [
      {
        label: "Category",
        value: titleCase(details.category),
      },
      {
        label: "Condition",
        value: titleCase(details.property_condition),
      },
      {
        label: "Bedrooms",
        value:
          details.bedrooms === null
            ? "Not stated"
            : String(details.bedrooms),
      },
      {
        label: "Bathrooms",
        value:
          details.bathrooms === null
            ? "Not stated"
            : String(details.bathrooms),
      },
      {
        label: "Title document",
        value: details.title_document || "Not stated",
      },
      {
        label: "Address",
        value: details.address,
      },
    ];
  }

  if (
    listing.listing_type === "marketplace" &&
    listing.marketplace_details
  ) {
    const details = listing.marketplace_details;

    return [
      {
        label: "Category",
        value: titleCase(details.category),
      },
      {
        label: "Condition",
        value: titleCase(details.condition),
      },
      {
        label: "Negotiable",
        value: details.is_negotiable ? "Yes" : "No",
      },
    ];
  }

  return [];
}


export default function AdminListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Listing | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");


  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const pending = await adminService.listPendingListings();

      setItems(pending);
      setExpandedId(null);
    } catch (reason) {
      setError(
        getApiErrorMessage(
          reason,
          "Pending listings could not be loaded.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    void load();
  }, [load]);


  const approve = async (listing: Listing) => {
    if (workingId) {
      return;
    }

    setWorkingId(listing.id);

    try {
      await adminService.approveListing(listing.id);

      setItems((current) =>
        current.filter((item) => item.id !== listing.id),
      );

      setExpandedId((current) =>
        current === listing.id ? null : current,
      );

      toast.success("Listing approved and published.");
    } catch (reason) {
      toast.error(getApiErrorMessage(reason));
    } finally {
      setWorkingId(null);
    }
  };


  const reject = async (reason: string) => {
    if (!rejectTarget || workingId) {
      return;
    }

    const listingId = rejectTarget.id;

    setWorkingId(listingId);

    try {
      await adminService.rejectListing(
        listingId,
        reason,
      );

      setItems((current) =>
        current.filter((item) => item.id !== listingId),
      );

      setExpandedId((current) =>
        current === listingId ? null : current,
      );

      setRejectTarget(null);

      toast.success(
        "Listing rejected with a moderation note.",
      );
    } catch (failure) {
      toast.error(getApiErrorMessage(failure));
    } finally {
      setWorkingId(null);
    }
  };


  return (
    <div className={shared.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <CheckSquare aria-hidden="true" />
            Listing moderation
          </span>

          <h1>Review before it goes live.</h1>

          <p>
            Check pricing, location, description, media and property
            details before publishing a submission to HomeLink.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.queueCount}>
            <span>Pending</span>
            <strong>{loading ? "—" : items.length}</strong>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw aria-hidden="true" />
            Refresh queue
          </button>
        </div>
      </header>


      <div className={styles.reviewGuide}>
        <strong>Moderation check</strong>

        <span>
          Confirm the price is plausible, the location matches the
          description, the media represents the listing clearly and
          there are no obvious duplicate or misleading submissions.
        </span>
      </div>


      {error ? (
        <div className={shared.error}>
          {error}
        </div>
      ) : null}


      {loading ? (
        <div className={styles.queue}>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className={styles.skeleton}
            />
          ))}
        </div>
      ) : null}


      {!loading && items.length === 0 ? (
        <section className={styles.empty}>
          <span>
            <CheckSquare aria-hidden="true" />
          </span>

          <h2>Moderation queue is clear.</h2>

          <p>
            New submissions will appear here when they require
            administrative review.
          </p>
        </section>
      ) : null}


      {!loading && items.length > 0 ? (
        <div className={styles.queue}>
          {items.map((listing, index) => {
            const cover = getCoverMedia(listing);
            const expanded = expandedId === listing.id;
            const busy = workingId === listing.id;
            const facts = getListingFacts(listing);

            return (
              <article
                key={listing.id}
                className={styles.listingCard}
              >
                <div className={styles.cover}>
                  {cover?.media_type === "image" ? (
                    <div
                      className={styles.coverImage}
                      role="img"
                      aria-label={`${listing.title} cover`}
                      style={{
                        backgroundImage: `url("${cover.url}")`,
                      }}
                    />
                  ) : (
                    <div className={styles.coverFallback}>
                      {cover?.media_type === "video" ? (
                        <Play aria-hidden="true" />
                      ) : (
                        <FileImage aria-hidden="true" />
                      )}

                      <span>
                        {cover ? "Video cover" : "No media"}
                      </span>
                    </div>
                  )}

                  <span className={styles.queuePosition}>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className={styles.mediaCount}>
                    <FileImage aria-hidden="true" />
                    {listing.media.length}
                  </span>
                </div>


                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <div className={styles.titleBlock}>
                      <span>
                        {titleCase(listing.listing_type)}
                      </span>

                      <h2>{listing.title}</h2>
                    </div>

                    <StatusBadge status={listing.status} />
                  </div>


                  <strong className={styles.price}>
                    {formatCurrency(
                      listing.price,
                      listing.currency,
                    )}
                  </strong>


                  <div className={styles.primaryMeta}>
                    <span>
                      <MapPin aria-hidden="true" />

                      {listing.area.name}

                      {listing.campus
                        ? ` · ${listing.campus.name}`
                        : ""}
                    </span>

                    <span>
                      <UserRound aria-hidden="true" />
                      {listing.owner.full_name}
                    </span>

                    <span>
                      <CalendarDays aria-hidden="true" />
                      {formatDate(listing.created_at)}
                    </span>
                  </div>


                  <p className={styles.description}>
                    {listing.description}
                  </p>


                  <button
                    type="button"
                    className={styles.reviewToggle}
                    onClick={() =>
                      setExpandedId(
                        expanded ? null : listing.id,
                      )
                    }
                  >
                    {expanded
                      ? "Hide full review"
                      : "Review details and media"}

                    {expanded ? (
                      <ChevronUp aria-hidden="true" />
                    ) : (
                      <ChevronDown aria-hidden="true" />
                    )}
                  </button>


                  {expanded ? (
                    <div className={styles.expandedReview}>
                      <section className={styles.reviewSection}>
                        <div className={styles.sectionHeading}>
                          <span>Listing facts</span>
                          <strong>Submission details</strong>
                        </div>

                        {facts.length > 0 ? (
                          <div className={styles.factGrid}>
                            {facts.map((fact) => (
                              <div key={fact.label}>
                                <span>{fact.label}</span>
                                <strong>{fact.value}</strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.muted}>
                            No additional listing details were supplied.
                          </p>
                        )}
                      </section>


                      <section className={styles.reviewSection}>
                        <div className={styles.sectionHeading}>
                          <span>Description</span>
                          <strong>Full submission copy</strong>
                        </div>

                        <p className={styles.fullDescription}>
                          {listing.description}
                        </p>
                      </section>


                      <section className={styles.reviewSection}>
                        <div className={styles.sectionHeading}>
                          <span>Media review</span>

                          <strong>
                            {listing.media.length} file
                            {listing.media.length === 1 ? "" : "s"}
                          </strong>
                        </div>

                        {listing.media.length === 0 ? (
                          <div className={styles.noMedia}>
                            <FileImage aria-hidden="true" />
                            <span>No media was submitted.</span>
                          </div>
                        ) : (
                          <div className={styles.mediaGrid}>
                            {[...listing.media]
                              .sort(
                                (a, b) =>
                                  a.sort_order - b.sort_order,
                              )
                              .map((media) => (
                                <div
                                  key={media.id}
                                  className={styles.mediaItem}
                                >
                                  {media.media_type === "image" ? (
                                    <div
                                      className={styles.mediaImage}
                                      role="img"
                                      aria-label={`Media for ${listing.title}`}
                                      style={{
                                        backgroundImage:
                                          `url("${media.url}")`,
                                      }}
                                    />
                                  ) : (
                                    <video
                                      controls
                                      preload="metadata"
                                      src={media.url}
                                    />
                                  )}

                                  <div className={styles.mediaMeta}>
                                    <span>
                                      {titleCase(media.media_type)}
                                    </span>

                                    {media.is_cover ? (
                                      <strong>Cover</strong>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </section>
                    </div>
                  ) : null}


                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.approveButton}
                      disabled={Boolean(workingId)}
                      onClick={() => void approve(listing)}
                    >
                      <Check aria-hidden="true" />
                      {busy ? "Working…" : "Approve listing"}
                    </button>

                    <button
                      type="button"
                      className={styles.rejectButton}
                      disabled={Boolean(workingId)}
                      onClick={() => setRejectTarget(listing)}
                    >
                      <X aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}


      <DecisionDialog
        open={Boolean(rejectTarget)}
        title="Reject this listing?"
        description={
          "The owner will see this reason and can correct the listing " +
          "before submitting it again."
        }
        confirmLabel="Reject listing"
        placeholder="Explain exactly what must be corrected…"
        minimumLength={10}
        tone="danger"
        submitting={Boolean(
          rejectTarget &&
          workingId === rejectTarget.id,
        )}
        onCancel={() => setRejectTarget(null)}
        onConfirm={reject}
      />
    </div>
  );
}