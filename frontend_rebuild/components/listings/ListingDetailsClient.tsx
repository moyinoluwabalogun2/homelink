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
  ArrowLeft,
  Bath,
  BedDouble,
  CheckCircle2,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api-errors";

import {
  formatCurrency,
  formatDate,
  initials,
  titleCase,
} from "@/lib/formatters";

import { engagementService } from "@/services/engagement-service";
import { listingService } from "@/services/listing-service";

import type {
  InquiryType,
  Listing,
} from "@/types/listing";

import styles from "./ListingDetailsClient.module.css";


export default function ListingDetailsClient({
  listingId,
}: {
  listingId: string;
}) {
  const router = useRouter();

  const { status } =
    useAuth();

  const [
    listing,
    setListing,
  ] = useState<Listing | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    activeImage,
    setActiveImage,
  ] = useState(0);

  const [
    saved,
    setSaved,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    inquiryType,
    setInquiryType,
  ] = useState<InquiryType>(
    "general",
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    sending,
    setSending,
  ] = useState(false);


  /* =========================================================
     LOAD LISTING
  ========================================================= */

  useEffect(() => {
    let active = true;

    setLoading(true);

    listingService
      .getById(listingId)
      .then((record) => {
        if (!active) {
          return;
        }

        setListing(record);
        setActiveImage(0);
        setError(null);
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            requestError,
            "This listing could not be found.",
          ),
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [listingId]);


  /* =========================================================
     SAVED STATE
  ========================================================= */

  useEffect(() => {
    if (
      status !== "authenticated"
    ) {
      return;
    }

    engagementService
      .listSaved()
      .then((records) => {
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
  }, [
    listingId,
    status,
  ]);


  const images = useMemo(
    () =>
      listing?.media.filter(
        (item) =>
          item.media_type ===
          "image",
      ) ?? [],
    [listing],
  );


  const details =
    listing?.rental_details ??
    listing?.buy_property_details;


  /* =========================================================
     SAVE
  ========================================================= */

  const toggleSave =
    async () => {
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

      setSaving(true);

      try {
        if (saved) {
          await engagementService.removeSavedListing(
            listingId,
          );

          setSaved(false);

          toast.success(
            "Removed from saved listings.",
          );
        } else {
          await engagementService.saveListing(
            listingId,
          );

          setSaved(true);

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
        setSaving(false);
      }
    };


  /* =========================================================
     SEND INQUIRY
  ========================================================= */

  const sendInquiry =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

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

      if (
        message.trim().length <
        10
      ) {
        toast.error(
          "Your message should contain at least 10 characters.",
        );

        return;
      }

      setSending(true);

      try {
        await engagementService.createInquiry(
          listingId,
          {
            inquiry_type:
              inquiryType,

            message:
              message.trim(),
          },
        );

        setMessage("");

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
        setSending(false);
      }
    };


  /* =========================================================
     STATES
  ========================================================= */

  if (loading) {
    return (
      <div
        className={
          styles.centerState
        }
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


  /* =========================================================
     LISTING META
  ========================================================= */

  const isMarketplace =
    listing.listing_type ===
    "marketplace";

  const isRental =
    listing.listing_type ===
    "rental";

  const category =
    listing.rental_details
      ?.category ??
    listing
      .buy_property_details
      ?.category ??
    listing
      .marketplace_details
      ?.category ??
    listing.listing_type;


  const browseHref =
    isRental
      ? "/rentals"
      : listing.listing_type ===
          "buy_property"
        ? "/buy-property"
        : "/marketplace";


  const browseLabel =
    isRental
      ? "Rentals"
      : listing.listing_type ===
          "buy_property"
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


  return (
    <div
      className={
        styles.page
      }
    >
      {/* =====================================================
          TOP BAR
      ====================================================== */}

      <div
        className={
          styles.topbar
        }
      >
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


        <div
          className={
            styles.breadcrumbs
          }
        >
          <Link href="/">
            Home
          </Link>

          <span>/</span>

          <Link
            href={
              browseHref
            }
          >
            {browseLabel}
          </Link>

          <span>/</span>

          <strong>
            Listing
          </strong>
        </div>
      </div>


      {/* =====================================================
          HERO / PRODUCT AREA
      ====================================================== */}

      <section
        className={[
          styles.heroLayout,

          isMarketplace
            ? styles.marketplaceHero
            : styles.propertyHero,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* ===============================================
            MEDIA
        ================================================ */}

        <div
          className={
            styles.galleryColumn
          }
        >
          <div
            className={
              styles.mainImage
            }
          >
            {images[
              activeImage
            ] ? (
              <Image
                src={
                  images[
                    activeImage
                  ].url
                }
                alt={
                  listing.title
                }
                fill
                priority
                sizes="(max-width: 900px) 100vw, 62vw"
                className={[
                  styles.mainPhoto,

                  isMarketplace
                    ? styles.marketPhoto
                    : styles.propertyPhoto,
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
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
                  No image supplied
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
              >
                {images.length
                  ? `${
                      activeImage +
                      1
                    } / ${
                      images.length
                    }`
                  : "No photos"}
              </span>
            </div>
          </div>


          {images.length >
          1 ? (
            <div
              className={
                styles.thumbnails
              }
            >
              {images
                .slice(
                  0,
                  6,
                )
                .map(
                  (
                    image,
                    index,
                  ) => (
                    <button
                      key={
                        image.id
                      }
                      type="button"
                      className={
                        index ===
                        activeImage
                          ? styles.activeThumbnail
                          : ""
                      }
                      onClick={() =>
                        setActiveImage(
                          index,
                        )
                      }
                      aria-label={`View image ${
                        index +
                        1
                      }`}
                    >
                      <Image
                        src={
                          image.url
                        }
                        alt=""
                        fill
                        sizes="120px"
                        className={
                          isMarketplace
                            ? styles.marketThumb
                            : styles.propertyThumb
                        }
                      />
                    </button>
                  ),
                )}
            </div>
          ) : null}
        </div>


        {/* ===============================================
            SUMMARY
        ================================================ */}

        <div
          className={
            styles.summary
          }
        >
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
              className={
                styles.published
              }
            >
              <CheckCircle2
                aria-hidden="true"
              />

              Published
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
              {
                listing.area
                  .name
              }

              {listing.campus
                ?.name
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

            {listing
              .rental_details ? (
              <small>
                Per{" "}
                {titleCase(
                  listing
                    .rental_details
                    .rent_period,
                )}
              </small>
            ) : null}
          </div>


          {/* Marketplace gets commerce-specific data */}

          {isMarketplace &&
          listing.marketplace_details ? (
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
                    listing
                      .marketplace_details
                      .condition,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Price
                </span>

                <strong>
                  {listing
                    .marketplace_details
                    .is_negotiable
                    ? "Negotiable"
                    : "Fixed"}
                </strong>
              </div>
            </div>
          ) : null}


          {/* Property/rental quick facts */}

          {!isMarketplace &&
          details ? (
            <div
              className={
                styles.quickFacts
              }
            >
              {details.bedrooms !==
                null &&
              details.bedrooms !==
                undefined ? (
                <span>
                  <BedDouble
                    aria-hidden="true"
                  />

                  {
                    details.bedrooms
                  }{" "}
                  bed
                </span>
              ) : null}


              {details.bathrooms !==
                null &&
              details.bathrooms !==
                undefined ? (
                <span>
                  <Bath
                    aria-hidden="true"
                  />

                  {
                    details.bathrooms
                  }{" "}
                  bath
                </span>
              ) : null}


              {listing
                .buy_property_details
                ?.land_size_sqm ? (
                <span>
                  <Ruler
                    aria-hidden="true"
                  />

                  {
                    listing
                      .buy_property_details
                      .land_size_sqm
                  }{" "}
                  m²
                </span>
              ) : null}


              {listing
                .rental_details
                ?.distance_to_campus_km ? (
                <span>
                  <MapPin
                    aria-hidden="true"
                  />

                  {
                    listing
                      .rental_details
                      .distance_to_campus_km
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


            <button
              type="button"
              className={[
                styles.saveButton,

                saved
                  ? styles.savedButton
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={
                toggleSave
              }
              disabled={
                saving
              }
            >
              <Heart
                aria-hidden="true"
                fill={
                  saved
                    ? "currentColor"
                    : "none"
                }
              />

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


      {/* =====================================================
          DETAILS
      ====================================================== */}

      <div
        className={
          styles.bodyLayout
        }
      >
        <main
          className={
            styles.mainContent
          }
        >
          {/* ===============================================
              KEY DETAILS
          ================================================ */}

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
              listing.marketplace_details ? (
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
                        listing
                          .marketplace_details
                          .condition,
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
                      {listing
                        .marketplace_details
                        .is_negotiable
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
                  {details
                    ?.bedrooms !==
                    null &&
                  details
                    ?.bedrooms !==
                    undefined ? (
                    <div>
                      <BedDouble
                        aria-hidden="true"
                      />

                      <span>
                        Bedrooms
                      </span>

                      <strong>
                        {
                          details.bedrooms
                        }
                      </strong>
                    </div>
                  ) : null}


                  {details
                    ?.bathrooms !==
                    null &&
                  details
                    ?.bathrooms !==
                    undefined ? (
                    <div>
                      <Bath
                        aria-hidden="true"
                      />

                      <span>
                        Bathrooms
                      </span>

                      <strong>
                        {
                          details.bathrooms
                        }
                      </strong>
                    </div>
                  ) : null}


                  {listing
                    .buy_property_details
                    ?.land_size_sqm ? (
                    <div>
                      <Ruler
                        aria-hidden="true"
                      />

                      <span>
                        Land size
                      </span>

                      <strong>
                        {
                          listing
                            .buy_property_details
                            .land_size_sqm
                        }{" "}
                        m²
                      </strong>
                    </div>
                  ) : null}


                  {listing
                    .rental_details
                    ?.distance_to_campus_km ? (
                    <div>
                      <MapPin
                        aria-hidden="true"
                      />

                      <span>
                        Campus distance
                      </span>

                      <strong>
                        {
                          listing
                            .rental_details
                            .distance_to_campus_km
                        }{" "}
                        km
                      </strong>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>


          {/* ===============================================
              DESCRIPTION
          ================================================ */}

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
                {
                  listing.description
                }
              </p>
            </div>
          </section>


          {/* ===============================================
              LOCATION
          ================================================ */}

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
                    {
                      listing.area
                        .name
                    }
                  </strong>

                  <p>
                    {listing.campus
                      ?.name ??
                      "OOU surrounding community"}
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


        {/* ===================================================
            CONTACT COLUMN
        ==================================================== */}

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
                    alt={`${listing.owner.full_name} profile`}
                    width={72}
                    height={72}
                  />
                ) : (
                  initials(
                    listing.owner
                      .full_name,
                  )
                )}
              </span>


              <div>
                <strong>
                  {
                    listing.owner
                      .full_name
                  }
                </strong>

                <span>
                  {
                    ownerTypeLabel
                  }
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
          </section>


          {/* ===============================================
              INQUIRY
          ================================================ */}

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
                  {
                    contactHeading
                  }
                </h2>

                <p>
                  {
                    contactDescription
                  }
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
                onChange={(
                  event,
                ) =>
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
                value={
                  message
                }
                onChange={(
                  event,
                ) =>
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
                ? "Send inquiry"
                : "Sign in to contact"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}