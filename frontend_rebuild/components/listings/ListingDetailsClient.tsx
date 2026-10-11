"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  Bath,
  BedDouble,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Play,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  toast,
} from "sonner";

import SponsoredPlacement
  from "@/components/advertising/SponsoredPlacement";

import ListingReportDialog
  from "@/components/listings/ListingReportDialog";

import {
  useAuth,
} from "@/context/AuthContext";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatCurrency,
  formatDate,
  initials,
  titleCase,
} from "@/lib/formatters";

import {
  engagementService,
} from "@/services/engagement-service";

import {
  listingService,
} from "@/services/listing-service";

import type {
  InquiryType,
  Listing,
  ListingMedia,
} from "@/types/listing";

import styles
  from "./ListingDetailsClient.module.css";


interface ListingDetailsClientProps {
  listingId: string;
}


function hasValue(
  value: unknown,
): boolean {
  return (
    value !== null &&
    value !== undefined &&
    value !== ""
  );
}


function orderedMedia(
  media: ListingMedia[],
): ListingMedia[] {
  return [
    ...media,
  ].sort(
    (
      first,
      second,
    ) => {
      if (
        first.is_cover !==
        second.is_cover
      ) {
        return first.is_cover
          ? -1
          : 1;
      }

      return (
        first.sort_order -
        second.sort_order
      );
    },
  );
}


function listingIsUnavailable(
  listing: Listing,
): boolean {
  return [
    "sold",
    "rented",
    "expired",
    "archived",
  ].includes(
    listing.status,
  );
}


function listingStatusText(
  listing: Listing,
): string {
  if (
    listing.status ===
    "sold"
  ) {
    return "Sold";
  }

  if (
    listing.status ===
    "rented"
  ) {
    return "Rented";
  }

  if (
    listing.status ===
    "expired"
  ) {
    return "Expired";
  }

  if (
    listing.status ===
    "archived"
  ) {
    return "Archived";
  }

  return "Published";
}


export default function ListingDetailsClient({
  listingId,
}: ListingDetailsClientProps) {
  const router =
    useRouter();

  const {
    status,
    user,
  } = useAuth();


  const [
    listing,
    setListing,
  ] = useState<
    Listing | null
  >(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(
    null,
  );

  const [
    activeMediaIndex,
    setActiveMediaIndex,
  ] = useState(
    0,
  );

  const [
    saved,
    setSaved,
  ] = useState(
    false,
  );

  const [
    saving,
    setSaving,
  ] = useState(
    false,
  );

  const [
    inquiryType,
    setInquiryType,
  ] = useState<InquiryType>(
    "general",
  );

  const [
    message,
    setMessage,
  ] = useState(
    "",
  );

  const [
    sending,
    setSending,
  ] = useState(
    false,
  );


  useEffect(() => {
    let active = true;

    const controller =
      new AbortController();

    setLoading(
      true,
    );

    setError(
      null,
    );

    listingService
      .getById(
        listingId,
        controller.signal,
      )
      .then((record) => {
        if (
          !active ||
          controller.signal
            .aborted
        ) {
          return;
        }

        setListing(
          record,
        );

        setActiveMediaIndex(
          0,
        );
      })
      .catch(
        (
          requestError,
        ) => {
          if (
            !active ||
            controller.signal
              .aborted
          ) {
            return;
          }

          setListing(
            null,
          );

          setError(
            getApiErrorMessage(
              requestError,
              "This listing could not be found.",
            ),
          );
        },
      )
      .finally(() => {
        if (
          active &&
          !controller.signal
            .aborted
        ) {
          setLoading(
            false,
          );
        }
      });

    return () => {
      active = false;

      controller.abort();
    };
  }, [
    listingId,
  ]);


  useEffect(() => {
    if (
      status !==
      "authenticated"
    ) {
      setSaved(
        false,
      );

      return;
    }

    let active = true;

    engagementService
      .listSaved()
      .then((records) => {
        if (!active) {
          return;
        }

        setSaved(
          records.some(
            (record) =>
              record.listing.id ===
              listingId,
          ),
        );
      })
      .catch(
        () => undefined,
      );

    return () => {
      active = false;
    };
  }, [
    listingId,
    status,
  ]);


  const media =
    useMemo(
      () =>
        listing
          ? orderedMedia(
              listing.media,
            )
          : [],
      [
        listing,
      ],
    );


  const activeMedia =
    media[
      activeMediaIndex
    ] ?? null;


  const showPreviousMedia =
    () => {
      if (
        !media.length
      ) {
        return;
      }

      setActiveMediaIndex(
        (current) =>
          current === 0
            ? media.length - 1
            : current - 1,
      );
    };


  const showNextMedia =
    () => {
      if (
        !media.length
      ) {
        return;
      }

      setActiveMediaIndex(
        (current) =>
          current ===
          media.length - 1
            ? 0
            : current + 1,
      );
    };


  const toggleSave =
    async () => {
      if (
        listing &&
        listingIsUnavailable(
          listing,
        )
      ) {
        toast.message(
          "This listing is no longer available.",
        );

        return;
      }

      if (
        status !==
        "authenticated"
      ) {
        toast.message(
          "Sign in to save this listing.",
        );

        router.push(
          `/login?next=${encodeURIComponent(
            `/listings/${listingId}`,
          )}`,
        );

        return;
      }

      if (saving) {
        return;
      }

      setSaving(
        true,
      );

      try {
        if (saved) {
          await engagementService
            .removeSavedListing(
              listingId,
            );

          setSaved(
            false,
          );

          toast.success(
            "Removed from saved listings.",
          );
        } else {
          await engagementService
            .saveListing(
              listingId,
            );

          setSaved(
            true,
          );

          toast.success(
            "Listing saved.",
          );
        }
      } catch (
        requestError
      ) {
        toast.error(
          getApiErrorMessage(
            requestError,
            "The listing could not be saved.",
          ),
        );
      } finally {
        setSaving(
          false,
        );
      }
    };


  const sendInquiry =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (sending) {
        return;
      }

      if (
        listing &&
        user?.id ===
          listing.owner.id
      ) {
        toast.message(
          "This is your own listing.",
        );

        return;
      }

      if (
        listing &&
        listingIsUnavailable(
          listing,
        )
      ) {
        toast.message(
          "This listing is no longer accepting inquiries.",
        );

        return;
      }

      if (
        status !==
        "authenticated"
      ) {
        toast.message(
          "Sign in before contacting the listing owner.",
        );

        router.push(
          `/login?next=${encodeURIComponent(
            `/listings/${listingId}`,
          )}`,
        );

        return;
      }

      const trimmedMessage =
        message.trim();

      if (
        trimmedMessage.length <
        10
      ) {
        toast.error(
          "Your message should contain at least 10 characters.",
        );

        return;
      }

      if (
        trimmedMessage.length >
        3000
      ) {
        toast.error(
          "Your message cannot exceed 3,000 characters.",
        );

        return;
      }

      setSending(
        true,
      );

      try {
        await engagementService
          .createInquiry(
            listingId,
            {
              inquiry_type:
                inquiryType,

              message:
                trimmedMessage,
            },
          );

        setMessage(
          "",
        );

        toast.success(
          "Your inquiry has been sent.",
        );
      } catch (
        requestError
      ) {
        toast.error(
          getApiErrorMessage(
            requestError,
            "Your inquiry could not be sent.",
          ),
        );
      } finally {
        setSending(
          false,
        );
      }
    };


  if (loading) {
    return (
      <div
        className={
          styles.centerState
        }
        role="status"
        aria-live="polite"
      >
        <Loader2
          className={
            styles.spinner
          }
          aria-hidden="true"
        />

        <span>
          Loading listing…
        </span>
      </div>
    );
  }


  if (
    error ||
    !listing
  ) {
    return (
      <div
        className={
          styles.centerState
        }
      >
        <Package
          aria-hidden="true"
        />

        <span
          className={
            styles.centerLabel
          }
        >
          HomeLink
        </span>

        <h1>
          Listing unavailable
        </h1>

        <p>
          {error ??
            "This listing may no longer be available."}
        </p>

        <Link href="/rentals">
          Browse available listings
        </Link>
      </div>
    );
  }


  const isMarketplace =
    listing.listing_type ===
    "marketplace";

  const isRental =
    listing.listing_type ===
    "rental";

  const isProperty =
    listing.listing_type ===
    "buy_property";

  const rental =
    listing.rental_details;

  const property =
    listing.buy_property_details;

  const marketplace =
    listing.marketplace_details;

  const details =
    rental ??
    property;


  const category =
    rental?.category ??
    property?.category ??
    marketplace?.category ??
    listing.listing_type;


  const browseHref =
    isRental
      ? "/rentals"
      : isProperty
        ? "/buy-property"
        : "/marketplace";


  const browseLabel =
    isRental
      ? "Rentals"
      : isProperty
        ? "Property"
        : "Marketplace";


  const ownerTypeLabel =
    listing.owner.role ===
    "agent"
      ? "Listing professional"
      : isMarketplace
        ? "Seller"
        : "Listing owner";


  const contactHeading =
    isMarketplace
      ? "Message the seller"
      : "Ask about this listing";


  const contactDescription =
    isMarketplace
      ? "Ask about condition, availability or pickup."
      : "Ask a question or request an inspection.";


  const safetyMessage =
    isMarketplace
      ? "Inspect the item before completing payment and keep pickup arrangements documented."
      : "Keep conversations and inspection arrangements documented before making payments.";


  /*
   * Do not expose the poster's full street address on the
   * public listing page. The precise address can be shared
   * privately after a legitimate inquiry or inspection request.
   */
  const publicLocation =
    listing.campus?.name ??
    "OOU surrounding community";


  const isOwner =
    user?.id ===
    listing.owner.id;


  const isUnavailable =
    listingIsUnavailable(
      listing,
    );


  const statusLabel =
    listingStatusText(
      listing,
    );


  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <button
          type="button"
          onClick={() =>
            router.back()
          }
        >
          <ArrowLeft
            aria-hidden="true"
          />

          Back
        </button>

        <nav
          className={
            styles.breadcrumbs
          }
          aria-label="Breadcrumb"
        >
          <Link href="/">
            Home
          </Link>

          <span
            aria-hidden="true"
          >
            /
          </span>

          <Link
            href={
              browseHref
            }
          >
            {browseLabel}
          </Link>

          <span
            aria-hidden="true"
          >
            /
          </span>

          <strong
            aria-current="page"
          >
            Listing
          </strong>
        </nav>
      </div>


      <section
        className={`${styles.heroLayout} ${
          isMarketplace
            ? styles.marketplaceHero
            : styles.propertyHero
        }`}
      >
        <div
          className={
            styles.galleryColumn
          }
        >
          <div
            className={
              styles.mainImage
            }
            role="group"
            aria-label={
              "Listing media gallery"
            }
            tabIndex={
              media.length > 1
                ? 0
                : -1
            }
            onKeyDown={
              (event) => {
                if (
                  event.key ===
                  "ArrowLeft"
                ) {
                  event.preventDefault();

                  showPreviousMedia();
                }

                if (
                  event.key ===
                  "ArrowRight"
                ) {
                  event.preventDefault();

                  showNextMedia();
                }
              }
            }
          >
            {activeMedia ? (
              activeMedia.media_type ===
              "video" ? (
                <video
                  key={
                    activeMedia.id
                  }
                  src={
                    activeMedia.url
                  }
                  className={
                    styles.mainVideo
                  }
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={
                    `${listing.title} video`
                  }
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <Image
                  key={
                    activeMedia.id
                  }
                  src={
                    activeMedia.url
                  }
                  alt={`${listing.title} — media ${
                    activeMediaIndex + 1
                  }`}
                  fill
                  priority={
                    activeMediaIndex ===
                    0
                  }
                  quality={86}
                  sizes={
                    "(max-width: 900px) 100vw, 62vw"
                  }
                  className={`${styles.mainPhoto} ${
                    isMarketplace
                      ? styles.marketPhoto
                      : styles.propertyPhoto
                  }`}
                />
              )
            ) : (
              <div
                className={
                  styles.imagePlaceholder
                }
              >
                <Package
                  aria-hidden="true"
                />

                <span>
                  No media supplied
                </span>
              </div>
            )}


            <div
              className={
                styles.imageTop
              }
            >
              <div
                className={
                  styles.imageBadges
                }
              >
                <span>
                  {titleCase(
                    category,
                  )}
                </span>

                {listing.is_featured ? (
                  <span
                    className={
                      styles.featuredBadge
                    }
                  >
                    <Sparkles
                      aria-hidden="true"
                    />

                    Featured
                  </span>
                ) : null}
              </div>

              <span
                className={
                  styles.imageCount
                }
                aria-live="polite"
              >
                {media.length
                  ? `${
                      activeMediaIndex + 1
                    } / ${media.length}`
                  : "No media"}
              </span>
            </div>


            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  className={`${styles.galleryControl} ${styles.previousControl}`}
                  onClick={
                    showPreviousMedia
                  }
                  aria-label={
                    "View previous media"
                  }
                >
                  <ChevronLeft
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  className={`${styles.galleryControl} ${styles.nextControl}`}
                  onClick={
                    showNextMedia
                  }
                  aria-label={
                    "View next media"
                  }
                >
                  <ChevronRight
                    aria-hidden="true"
                  />
                </button>
              </>
            ) : null}
          </div>


          {media.length > 1 ? (
            <div
              className={
                styles.thumbnails
              }
              role="group"
              aria-label={
                "Listing media"
              }
            >
              {media.map(
                (
                  mediaItem,
                  index,
                ) => (
                  <button
                    key={
                      mediaItem.id
                    }
                    type="button"
                    className={
                      index ===
                      activeMediaIndex
                        ? styles
                            .activeThumbnail
                        : ""
                    }
                    onClick={() =>
                      setActiveMediaIndex(
                        index,
                      )
                    }
                    aria-label={`View ${
                      mediaItem.media_type ===
                      "video"
                        ? "video"
                        : "image"
                    } ${index + 1}`}
                    aria-pressed={
                      index ===
                      activeMediaIndex
                    }
                  >
                    {mediaItem.media_type ===
                    "video" ? (
                      <span
                        className={
                          styles.videoThumbnail
                        }
                      >
                        <Play
                          aria-hidden="true"
                        />

                        <small>
                          Video
                        </small>
                      </span>
                    ) : (
                      <Image
                        src={
                          mediaItem.url
                        }
                        alt=""
                        fill
                        sizes="110px"
                        className={
                          isMarketplace
                            ? styles
                                .marketThumb
                            : styles
                                .propertyThumb
                        }
                      />
                    )}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>


        <div className={styles.summary}>
          <div
            className={
              styles.summaryMeta
            }
          >
            <span>
              {titleCase(
                category,
              )}
            </span>

            <span
              className={`${styles.published} ${
                isUnavailable
                  ? styles.unavailableStatus
                  : ""
              }`}
            >
              <CheckCircle2
                aria-hidden="true"
              />

              {statusLabel}
            </span>
          </div>

          <h1>
            {listing.title}
          </h1>

          <div
            className={
              styles.summaryLocation
            }
          >
            <MapPin
              aria-hidden="true"
            />

            <span>
              {listing.area.name}

              {listing.campus?.name
                ? ` · ${listing.campus.name}`
                : ""}
            </span>
          </div>

          <div
            className={
              styles.priceBlock
            }
          >
            <span>
              Price
            </span>

            <strong>
              {formatCurrency(
                listing.price,
                listing.currency,
              )}
            </strong>

            {rental ? (
              <small>
                Per{" "}

                {titleCase(
                  rental.rent_period,
                )}
              </small>
            ) : null}
          </div>


          {isMarketplace &&
          marketplace ? (
            <div
              className={
                styles.commerceFacts
              }
            >
              <div>
                <span>
                  Condition
                </span>

                <strong>
                  {titleCase(
                    marketplace.condition,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Price
                </span>

                <strong>
                  {marketplace.is_negotiable
                    ? "Negotiable"
                    : "Fixed"}
                </strong>
              </div>
            </div>
          ) : null}


          {!isMarketplace &&
          details ? (
            <div
              className={
                styles.quickFacts
              }
            >
              {hasValue(
                details.bedrooms,
              ) ? (
                <span>
                  <BedDouble
                    aria-hidden="true"
                  />

                  {details.bedrooms} bed
                </span>
              ) : null}

              {hasValue(
                details.bathrooms,
              ) ? (
                <span>
                  <Bath
                    aria-hidden="true"
                  />

                  {details.bathrooms} bath
                </span>
              ) : null}

              {hasValue(
                property
                  ?.land_size_sqm,
              ) ? (
                <span>
                  <Ruler
                    aria-hidden="true"
                  />

                  {
                    property
                      ?.land_size_sqm
                  }{" "}
                  m²
                </span>
              ) : null}

              {hasValue(
                rental
                  ?.distance_to_campus_km,
              ) ? (
                <span>
                  <MapPin
                    aria-hidden="true"
                  />

                  {
                    rental
                      ?.distance_to_campus_km
                  }{" "}
                  km
                </span>
              ) : null}
            </div>
          ) : null}


          <div
            className={
              styles.summaryActions
            }
          >
            {isOwner ? (
              <Link
                href={
                  "/dashboard/listings"
                }
                className={
                  styles.contactButton
                }
              >
                Manage your listing
              </Link>
            ) : isUnavailable ? (
              <span
                className={
                  styles.unavailableAction
                }
              >
                This listing is no longer available
              </span>
            ) : (
              <a
                href="#inquiry"
                className={
                  styles.contactButton
                }
              >
                <MessageSquare
                  aria-hidden="true"
                />

                {isMarketplace
                  ? "Message seller"
                  : "Ask about listing"}
              </a>
            )}

            <button
              type="button"
              className={`${styles.saveButton} ${
                saved
                  ? styles.savedButton
                  : ""
              }`}
              onClick={
                toggleSave
              }
              disabled={
                saving ||
                isUnavailable
              }
              aria-pressed={
                saved
              }
              aria-label={
                saving
                  ? "Updating saved listing"
                  : saved
                    ? "Remove from saved listings"
                    : "Save listing"
              }
            >
              {saving ? (
                <Loader2
                  className={
                    styles.spinner
                  }
                  aria-hidden="true"
                />
              ) : (
                <Heart
                  aria-hidden="true"
                  fill={
                    saved
                      ? "currentColor"
                      : "none"
                  }
                />
              )}

              {saved
                ? "Saved"
                : "Save"}
            </button>
          </div>


          <div
            className={
              styles.summarySafety
            }
          >
            <ShieldCheck
              aria-hidden="true"
            />

            <p>
              {safetyMessage}
            </p>
          </div>
        </div>
      </section>


      <SponsoredPlacement
        placement={
          "listing_detail"
        }
      />


      <div className={styles.bodyLayout}>
        <main
          className={
            styles.mainContent
          }
        >
          <section
            className={
              styles.detailSection
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
                Key details
              </h2>
            </div>

            <div
              className={
                styles.detailContent
              }
            >
              {isMarketplace &&
              marketplace ? (
                <div
                  className={
                    styles.detailGrid
                  }
                >
                  <div>
                    <Package
                      aria-hidden="true"
                    />

                    <span>
                      Condition
                    </span>

                    <strong>
                      {titleCase(
                        marketplace.condition,
                      )}
                    </strong>
                  </div>

                  <div>
                    <CheckCircle2
                      aria-hidden="true"
                    />

                    <span>
                      Negotiation
                    </span>

                    <strong>
                      {marketplace.is_negotiable
                        ? "Negotiable"
                        : "Fixed price"}
                    </strong>
                  </div>
                </div>
              ) : (
                <div
                  className={
                    styles.detailGrid
                  }
                >
                  {hasValue(
                    details
                      ?.bedrooms,
                  ) ? (
                    <div>
                      <BedDouble
                        aria-hidden="true"
                      />

                      <span>
                        Bedrooms
                      </span>

                      <strong>
                        {
                          details
                            ?.bedrooms
                        }
                      </strong>
                    </div>
                  ) : null}

                  {hasValue(
                    details
                      ?.bathrooms,
                  ) ? (
                    <div>
                      <Bath
                        aria-hidden="true"
                      />

                      <span>
                        Bathrooms
                      </span>

                      <strong>
                        {
                          details
                            ?.bathrooms
                        }
                      </strong>
                    </div>
                  ) : null}

                  {hasValue(
                    details
                      ?.toilets,
                  ) ? (
                    <div>
                      <CheckCircle2
                        aria-hidden="true"
                      />

                      <span>
                        Toilets
                      </span>

                      <strong>
                        {
                          details
                            ?.toilets
                        }
                      </strong>
                    </div>
                  ) : null}

                  {rental ? (
                    <div>
                      <Package
                        aria-hidden="true"
                      />

                      <span>
                        Furnishing
                      </span>

                      <strong>
                        {rental.is_furnished
                          ? "Furnished"
                          : "Unfurnished"}
                      </strong>
                    </div>
                  ) : null}

                  {rental ? (
                    <div>
                      <CheckCircle2
                        aria-hidden="true"
                      />

                      <span>
                        Rent period
                      </span>

                      <strong>
                        {titleCase(
                          rental.rent_period,
                        )}
                      </strong>
                    </div>
                  ) : null}

                  {hasValue(
                    rental
                      ?.distance_to_campus_km,
                  ) ? (
                    <div>
                      <MapPin
                        aria-hidden="true"
                      />

                      <span>
                        Campus distance
                      </span>

                      <strong>
                        {
                          rental
                            ?.distance_to_campus_km
                        }{" "}
                        km
                      </strong>
                    </div>
                  ) : null}

                  {hasValue(
                    rental
                      ?.caution_fee,
                  ) ? (
                    <div>
                      <Package
                        aria-hidden="true"
                      />

                      <span>
                        Caution fee
                      </span>

                      <strong>
                        {formatCurrency(
                          rental
                            ?.caution_fee ??
                            0,
                          listing.currency,
                        )}
                      </strong>
                    </div>
                  ) : null}

                  {hasValue(
                    rental
                      ?.service_charge,
                  ) ? (
                    <div>
                      <Package
                        aria-hidden="true"
                      />

                      <span>
                        Service charge
                      </span>

                      <strong>
                        {formatCurrency(
                          rental
                            ?.service_charge ??
                            0,
                          listing.currency,
                        )}
                      </strong>
                    </div>
                  ) : null}

                  {property ? (
                    <div>
                      <CheckCircle2
                        aria-hidden="true"
                      />

                      <span>
                        Property condition
                      </span>

                      <strong>
                        {titleCase(
                          property
                            .property_condition,
                        )}
                      </strong>
                    </div>
                  ) : null}

                  {hasValue(
                    property
                      ?.land_size_sqm,
                  ) ? (
                    <div>
                      <Ruler
                        aria-hidden="true"
                      />

                      <span>
                        Land size
                      </span>

                      <strong>
                        {
                          property
                            ?.land_size_sqm
                        }{" "}
                        m²
                      </strong>
                    </div>
                  ) : null}

                  {hasValue(
                    property
                      ?.title_document,
                  ) ? (
                    <div>
                      <Package
                        aria-hidden="true"
                      />

                      <span>
                        Title document
                      </span>

                      <strong>
                        {
                          property
                            ?.title_document
                        }
                      </strong>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>


          <section
            className={
              styles.detailSection
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
                About this listing
              </h2>
            </div>

            <div
              className={
                styles.detailContent
              }
            >
              <p
                className={
                  styles.description
                }
              >
                {listing.description}
              </p>
            </div>
          </section>


          <section
            className={
              styles.detailSection
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
                {isMarketplace
                  ? "Pickup area"
                  : "Location & availability"}
              </h2>
            </div>

            <div
              className={
                styles.detailContent
              }
            >
              <div
                className={
                  styles.locationPanel
                }
              >
                <span
                  className={
                    styles.locationIcon
                  }
                >
                  <MapPin
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <small>
                    Area
                  </small>

                  <strong>
                    {listing.area.name}
                  </strong>

                  <p>
                    {publicLocation}
                  </p>

                  <span>
                    Published{" "}

                    {formatDate(
                      listing.published_at,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </main>


        <aside
          className={
            styles.sideColumn
          }
        >
          <section
            className={
              styles.ownerSection
            }
          >
            <span
              className={
                styles.ownerLabel
              }
            >
              {isMarketplace
                ? "Seller"
                : "Listed by"}
            </span>

            <div
              className={
                styles.ownerTop
              }
            >
              <span
                className={
                  styles.avatar
                }
              >
                {listing.owner
                  .profile_image_url ? (
                  <Image
                    src={
                      listing.owner
                        .profile_image_url
                    }
                    alt={
                      `${listing.owner.full_name} profile`
                    }
                    width={72}
                    height={72}
                  />
                ) : (
                  initials(
                    listing.owner.full_name,
                  )
                )}
              </span>

              <div>
                <strong>
                  {listing.owner.full_name}
                </strong>

                <span>
                  {ownerTypeLabel}
                </span>
              </div>
            </div>

            <div
              className={
                styles.ownerSafety
              }
            >
              <ShieldCheck
                aria-hidden="true"
              />

              <p>
                {safetyMessage}
              </p>
            </div>

            <div
              className={
                styles.reportRow
              }
            >
              <ListingReportDialog
                listingId={
                  listing.id
                }
                listingTitle={
                  listing.title
                }
                ownerId={
                  listing.owner.id
                }
              />
            </div>
          </section>


          {isOwner ? (
            <section
              id="inquiry"
              className={
                styles.actionNotice
              }
            >
              <ShieldCheck
                aria-hidden="true"
              />

              <h2>
                This is your listing
              </h2>

              <p>
                Manage its status, media and details
                from your listing dashboard.
              </p>

              <Link
                href={
                  "/dashboard/listings"
                }
              >
                Manage listing
              </Link>
            </section>
          ) : isUnavailable ? (
            <section
              id="inquiry"
              className={
                styles.actionNotice
              }
            >
              <Package
                aria-hidden="true"
              />

              <h2>
                Listing{" "}
                {statusLabel
                  .toLowerCase()}
              </h2>

              <p>
                This listing is retained for context
                but is no longer accepting inquiries.
              </p>

              <Link
                href={
                  browseHref
                }
              >
                Browse available{" "}
                {browseLabel
                  .toLowerCase()}
              </Link>
            </section>
          ) : (
            <form
              id="inquiry"
              className={
                styles.inquiryCard
              }
              onSubmit={
                sendInquiry
              }
            >
              <div
                className={
                  styles.inquiryHeading
                }
              >
                <span
                  className={
                    styles.inquiryIcon
                  }
                >
                  <MessageSquare
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <span>
                    Contact
                  </span>

                  <h2>
                    {contactHeading}
                  </h2>

                  <p>
                    {contactDescription}
                  </p>
                </div>
              </div>

              <label>
                <span>
                  Inquiry type
                </span>

                <select
                  value={
                    inquiryType
                  }
                  onChange={
                    (event) =>
                      setInquiryType(
                        event.target
                          .value as InquiryType,
                      )
                  }
                >
                  <option value="general">
                    General question
                  </option>

                  <option value="inspection">
                    {isMarketplace
                      ? "Arrange pickup / viewing"
                      : "Request inspection"}
                  </option>
                </select>
              </label>

              <label>
                <span>
                  Message
                </span>

                <textarea
                  rows={5}
                  minLength={10}
                  maxLength={3000}
                  required
                  value={
                    message
                  }
                  onChange={
                    (event) =>
                      setMessage(
                        event.target
                          .value,
                      )
                  }
                  placeholder={
                    isMarketplace
                      ? "Hello, is this item still available?"
                      : "Hello, I would like to know whether this listing is still available…"
                  }
                />

                <small>
                  {message.length
                    .toLocaleString()}
                  /3,000
                </small>
              </label>

              <button
                type="submit"
                disabled={
                  sending
                }
              >
                {sending ? (
                  <Loader2
                    className={
                      styles.spinner
                    }
                    aria-hidden="true"
                  />
                ) : (
                  <MessageSquare
                    aria-hidden="true"
                  />
                )}

                {status ===
                "authenticated"
                  ? sending
                    ? "Sending…"
                    : "Send inquiry"
                  : "Sign in to contact"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}