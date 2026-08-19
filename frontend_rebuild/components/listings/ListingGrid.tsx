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
  listings: Listing[];
  listingType: ListingType;
  loading: boolean;
  savedIds: Set<string>;
  savingId: string | null;

  onToggleSaved:
    (listing: Listing) =>
      void;

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
    listingType ===
    "marketplace";


  const gridClassName = [
    styles.grid,

    isMarketplace
      ? styles.marketGrid
      : styles.propertyGrid,
  ]
    .filter(Boolean)
    .join(" ");


  if (loading) {
    return (
      <div
        className={
          gridClassName
        }
        aria-label="Loading listings"
      >
        {Array.from(
          {
            length:
              isMarketplace
                ? 8
                : 6,
          },
          (_, index) => (
            <div
              key={index}
              className={
                styles.skeleton
              }
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
        )}
      </div>
    );
  }


  if (
    listings.length === 0
  ) {
    return (
      <div
        className={
          styles.empty
        }
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
          Nothing here yet
        </span>

        <h2>
          {isMarketplace
            ? "No matching items."
            : "No matching listings."}
        </h2>

        <p>
          {isMarketplace
            ? "Try another category, widen your budget or remove one of the current filters."
            : "Try another area, widen your budget or remove one of the current filters."}
        </p>

        <button
          type="button"
          onClick={
            onClearFilters
          }
        >
          Clear all filters
        </button>
      </div>
    );
  }


  return (
    <div
      className={
        gridClassName
      }
    >
      {listings.map(
        (listing) => (
          <ListingCard
            key={
              listing.id
            }
            listing={
              listing
            }
            saved={
              savedIds.has(
                listing.id,
              )
            }
            saving={
              savingId ===
              listing.id
            }
            onToggleSaved={
              onToggleSaved
            }
          />
        ),
      )}
    </div>
  );
}