"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Bath,
  BedDouble,
  CheckCircle2,
  Heart,
  MapPin,
  Package,
  Ruler,
} from "lucide-react";

import {
  formatCurrency,
  titleCase,
} from "@/lib/formatters";

import type {
  Listing,
} from "@/types/listing";

import styles from "./ListingCard.module.css";


interface ListingCardProps {
  listing: Listing;

  saved?: boolean;
  saving?: boolean;

  onToggleSaved?: (
    listing: Listing,
  ) => void;
}


function coverImage(
  listing: Listing,
): string | null {
  const cover =
    listing.media.find(
      (item) =>
        item.media_type ===
          "image" &&
        item.is_cover,
    );

  const firstImage =
    listing.media.find(
      (item) =>
        item.media_type ===
        "image",
    );

  return (
    cover?.url ??
    firstImage?.url ??
    null
  );
}


function categoryLabel(
  listing: Listing,
): string {
  return titleCase(
    listing.rental_details
      ?.category ??
      listing
        .buy_property_details
        ?.category ??
      listing
        .marketplace_details
        ?.category ??
      listing.listing_type,
  );
}


export default function ListingCard({
  listing,
  saved = false,
  saving = false,
  onToggleSaved,
}: ListingCardProps) {
  const image =
    coverImage(
      listing,
    );


  const isMarketplace =
    listing.listing_type ===
    "marketplace";


  const propertyDetails =
    listing.rental_details ??
    listing.buy_property_details;


  const marketplaceDetails =
    listing.marketplace_details;


  return (
    <article
      className={[
        styles.card,

        isMarketplace
          ? styles.marketplaceCard
          : styles.propertyCard,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* =================================================
          MEDIA
      ================================================== */}

      <div
        className={[
          styles.media,

          isMarketplace
            ? styles.marketMedia
            : styles.propertyMedia,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Link
          href={`/listings/${listing.id}`}
          className={
            styles.mediaLink
          }
          aria-label={`View ${listing.title}`}
        >
          {image ? (
            <Image
              src={image}
              alt={
                listing.title
              }
              fill
              quality={82}
              sizes={
                isMarketplace
                  ? "(max-width: 800px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  : "(max-width: 650px) 100vw, (max-width: 1060px) 50vw, 33vw"
              }
              className={[
                styles.image,

                isMarketplace
                  ? styles.marketImage
                  : styles.propertyImage,
              ]
                .filter(Boolean)
                .join(" ")}
            />
          ) : (
            <div
              className={
                styles.placeholder
              }
            >
              <Package
                aria-hidden="true"
              />

              <span>
                Photo coming soon
              </span>
            </div>
          )}
        </Link>


        <div
          className={
            styles.badges
          }
        >
          {listing.is_featured ? (
            <span
              className={
                styles.featuredBadge
              }
            >
              Featured
            </span>
          ) : null}


          <span
            className={
              styles.categoryBadge
            }
          >
            {categoryLabel(
              listing,
            )}
          </span>
        </div>


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
          onClick={() =>
            onToggleSaved?.(
              listing,
            )
          }
          disabled={
            saving
          }
          aria-label={
            saved
              ? "Remove from saved listings"
              : "Save listing"
          }
          aria-pressed={
            saved
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
        </button>
      </div>


      {/* =================================================
          MARKETPLACE CONTENT
      ================================================== */}

      {isMarketplace ? (
        <div
          className={[
            styles.content,
            styles.marketContent,
          ].join(" ")}
        >
          <div
            className={
              styles.priceRow
            }
          >
            <strong>
              {formatCurrency(
                listing.price,
                listing.currency,
              )}
            </strong>
          </div>


          <Link
            href={`/listings/${listing.id}`}
            className={
              styles.titleLink
            }
          >
            <h2>
              {listing.title}
            </h2>
          </Link>


          <div
            className={
              styles.marketFacts
            }
          >
            <span>
              <CheckCircle2
                aria-hidden="true"
              />

              {titleCase(
                marketplaceDetails
                  ?.condition ??
                  "available",
              )}
            </span>

            {marketplaceDetails
              ?.is_negotiable ? (
              <span
                className={
                  styles.negotiable
                }
              >
                Negotiable
              </span>
            ) : null}
          </div>


          <p
            className={
              styles.location
            }
          >
            <MapPin
              aria-hidden="true"
            />

            <span>
              {
                listing.area.name
              }

              {listing.campus
                ?.name
                ? ` · ${listing.campus.name}`
                : ""}
            </span>
          </p>
        </div>
      ) : (
        /* =================================================
           PROPERTY / RENTAL CONTENT
        ================================================== */

        <div
          className={
            styles.content
          }
        >
          <div
            className={
              styles.priceRow
            }
          >
            <strong>
              {formatCurrency(
                listing.price,
                listing.currency,
              )}
            </strong>

            {listing.rental_details ? (
              <span>
                /{" "}
                {titleCase(
                  listing
                    .rental_details
                    .rent_period,
                )}
              </span>
            ) : null}
          </div>


          <Link
            href={`/listings/${listing.id}`}
            className={
              styles.titleLink
            }
          >
            <h2>
              {listing.title}
            </h2>
          </Link>


          <p
            className={
              styles.location
            }
          >
            <MapPin
              aria-hidden="true"
            />

            <span>
              {
                listing.area.name
              }

              {listing.campus
                ?.name
                ? ` · ${listing.campus.name}`
                : ""}
            </span>
          </p>


          {propertyDetails ? (
            <div
              className={
                styles.propertyFacts
              }
            >
              {propertyDetails
                .bedrooms !=
              null ? (
                <span>
                  <BedDouble
                    aria-hidden="true"
                  />

                  {
                    propertyDetails
                      .bedrooms
                  }{" "}
                  bed
                </span>
              ) : null}


              {propertyDetails
                .bathrooms !=
              null ? (
                <span>
                  <Bath
                    aria-hidden="true"
                  />

                  {
                    propertyDetails
                      .bathrooms
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
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}