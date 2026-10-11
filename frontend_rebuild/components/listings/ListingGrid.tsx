import {
  SearchX,
} from "lucide-react";

import type {
  Listing,
  ListingType,
} from "@/types/listing";

import ListingCard from "./ListingCard";

import styles from "./ListingGrid.module.css";


interface ListingGridProps {
  listings:
    Listing[];

  listingType:
    ListingType;

  loading:
    boolean;

  savedIds:
    Set<string>;

  savingId:
    string | null;

  onToggleSaved: (
    listing: Listing,
  ) => void;

  onClearFilters:
    () => void;
}


export default function ListingGrid({
  listings,
  listingType,
  loading,
  savedIds,
  savingId,
  onToggleSaved,
  onClearFilters,
}: ListingGridProps) {
  const isMarketplace =
    listingType
    === "marketplace";


  const gridClassName = [
    styles.grid,

    isMarketplace
      ? styles.marketGrid
      : styles.propertyGrid,
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    );


  if (loading) {
    return (
      <div
        className={
          gridClassName
        }
        aria-label={
          "Loading listings"
        }
        aria-live="polite"
        aria-busy="true"
      >
        <span
          className={
            styles.srOnly
          }
        >
          Loading listings…
        </span>

        {
          Array.from(
            {
              length:
                isMarketplace
                  ? 8
                  : 6,
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
                  styles.skeleton
                }
                aria-hidden="true"
              >
                <div
                  className={
                    styles.skeletonMedia
                  }
                />

                <div
                  className={
                    styles.skeletonContent
                  }
                >
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ),
          )
        }
      </div>
    );
  }


  if (
    listings.length
    === 0
  ) {
    return (
      <section
        className={
          styles.empty
        }
        aria-labelledby={
          "listing-empty-title"
        }
        aria-live="polite"
      >
        <span
          className={
            styles.emptyIcon
          }
        >
          <SearchX
            aria-hidden="true"
          />
        </span>

        <span
          className={
            styles.emptyLabel
          }
        >
          No results
        </span>

        <h2
          id={
            "listing-empty-title"
          }
        >
          {
            isMarketplace
              ? "No matching items yet."
              : "No matching listings yet."
          }
        </h2>

        <p>
          {
            isMarketplace
              ? (
                  "Try another category, widen your budget "
                  + "or remove one of the current filters."
                )
              : (
                  "Try another area, widen your budget "
                  + "or remove one of the current filters."
                )
          }
        </p>

        <button
          type="button"
          onClick={
            onClearFilters
          }
        >
          Clear all filters
        </button>
      </section>
    );
  }


  return (
    <div
      className={
        gridClassName
      }
      role="list"
      aria-label={
        isMarketplace
          ? "Marketplace items"
          : "Property listings"
      }
    >
      {
        listings.map(
          (
            listing,
          ) => (
            <div
              key={
                listing.id
              }
              role="listitem"
              className={
                styles.gridItem
              }
            >
              <ListingCard
                listing={
                  listing
                }
                saved={
                  savedIds.has(
                    listing.id,
                  )
                }
                saving={
                  savingId
                  === listing.id
                }
                onToggleSaved={
                  onToggleSaved
                }
              />
            </div>
          ),
        )
      }
    </div>
  );
}