"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  Bookmark,
  Building2,
  Home,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";

import { toast } from "sonner";

import ListingCard from "@/components/listings/ListingCard";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  engagementService,
} from "@/services/engagement-service";

import type {
  SavedListing,
} from "@/types/listing";

import styles from "./page.module.css";


type SavedFilter =
  | "all"
  | "rental"
  | "buy_property"
  | "marketplace";


const filters: {
  value: SavedFilter;
  label: string;
  icon: typeof Bookmark;
}[] = [
  {
    value: "all",
    label: "All saved",
    icon: Bookmark,
  },
  {
    value: "rental",
    label: "Rentals",
    icon: Home,
  },
  {
    value: "buy_property",
    label: "Property",
    icon: Building2,
  },
  {
    value: "marketplace",
    label: "Marketplace",
    icon: Store,
  },
];


export default function SavedListingsPage() {
  const [
    items,
    setItems,
  ] =
    useState<SavedListing[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    removingId,
    setRemovingId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<SavedFilter>(
      "all",
    );


  /* =========================================================
     LOAD SAVED LISTINGS
  ========================================================= */

  const loadSaved =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const records =
            await engagementService.listSaved();

          setItems(
            records,
          );
        } catch (
          reason
        ) {
          setError(
            getApiErrorMessage(
              reason,
              "Saved listings could not be loaded.",
            ),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );


  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);


  /* =========================================================
     REMOVE SAVED LISTING
  ========================================================= */

  const remove =
    async (
      listingId: string,
    ) => {
      if (removingId) {
        return;
      }

      setRemovingId(
        listingId,
      );

      try {
        await engagementService.removeSavedListing(
          listingId,
        );

        setItems(
          (
            current,
          ) =>
            current.filter(
              (
                item,
              ) =>
                item.listing.id !==
                listingId,
            ),
        );

        toast.success(
          "Removed from saved listings.",
        );
      } catch (
        reason
      ) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Could not remove this saved listing.",
          ),
        );
      } finally {
        setRemovingId(
          null,
        );
      }
    };


  /* =========================================================
     FILTERING
  ========================================================= */

  const visibleItems =
    useMemo(
      () => {
        if (
          filter === "all"
        ) {
          return items;
        }

        return items.filter(
          (
            item,
          ) =>
            item.listing
              .listing_type ===
            filter,
        );
      },
      [
        filter,
        items,
      ],
    );


  const counts =
    useMemo(
      () => ({
        all:
          items.length,

        rental:
          items.filter(
            (item) =>
              item.listing
                .listing_type ===
              "rental",
          ).length,

        buy_property:
          items.filter(
            (item) =>
              item.listing
                .listing_type ===
              "buy_property",
          ).length,

        marketplace:
          items.filter(
            (item) =>
              item.listing
                .listing_type ===
              "marketplace",
          ).length,
      }),
      [items],
    );


  return (
    <div
      className={
        styles.page
      }
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header
        className={
          styles.header
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            <Bookmark
              aria-hidden="true"
            />

            Saved
          </span>

          <h1>
            Your shortlist.
          </h1>

          <p>
            Keep rentals,
            properties and
            marketplace finds
            together while you
            compare your options.
          </p>
        </div>


        {!loading &&
        items.length > 0 ? (
          <div
            className={
              styles.savedCount
            }
          >
            <strong>
              {items.length}
            </strong>

            <span>
              {items.length ===
              1
                ? "saved listing"
                : "saved listings"}
            </span>
          </div>
        ) : null}
      </header>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {error ? (
        <div
          className={
            styles.error
          }
          role="alert"
        >
          <div>
            <strong>
              Couldn&apos;t load
              your shortlist.
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadSaved()
            }
          >
            <RefreshCw
              aria-hidden="true"
            />

            Try again
          </button>
        </div>
      ) : null}


      {/* =====================================================
          LOADING
      ====================================================== */}

      {loading ? (
        <div
          className={
            styles.grid
          }
          aria-label="Loading saved listings"
        >
          {Array.from(
            {
              length: 6,
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
              />
            ),
          )}
        </div>
      ) : null}


      {/* =====================================================
          EMPTY
      ====================================================== */}

      {!loading &&
      !error &&
      items.length === 0 ? (
        <section
          className={
            styles.empty
          }
        >
          <span
            className={
              styles.emptyIcon
            }
          >
            <Search
              aria-hidden="true"
            />
          </span>

          <span
            className={
              styles.emptyEyebrow
            }
          >
            Nothing saved yet
          </span>

          <h2>
            Build a shortlist
            as you browse.
          </h2>

          <p>
            Save any rental,
            property or
            marketplace listing
            and it will appear
            here for you to
            revisit.
          </p>

          <div
            className={
              styles.emptyActions
            }
          >
            <Link
              href="/rentals"
              className={
                styles.primaryAction
              }
            >
              Browse rentals
            </Link>

            <Link
              href="/marketplace"
              className={
                styles.secondaryAction
              }
            >
              Explore marketplace
            </Link>
          </div>
        </section>
      ) : null}


      {/* =====================================================
          SAVED LISTINGS
      ====================================================== */}

      {!loading &&
      !error &&
      items.length > 0 ? (
        <>
          <section
            className={
              styles.toolbar
            }
          >
            <div
              className={
                styles.toolbarIntro
              }
            >
              <span>
                Shortlist
              </span>

              <strong>
                Filter what
                you&apos;ve saved
              </strong>
            </div>


            <div
              className={
                styles.filters
              }
              aria-label="Filter saved listings"
            >
              {filters.map(
                (
                  option,
                ) => {
                  const Icon =
                    option.icon;

                  const active =
                    filter ===
                    option.value;

                  return (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      className={
                        active
                          ? styles.activeFilter
                          : ""
                      }
                      onClick={() =>
                        setFilter(
                          option.value,
                        )
                      }
                    >
                      <Icon
                        aria-hidden="true"
                      />

                      <span>
                        {
                          option.label
                        }
                      </span>

                      <b>
                        {
                          counts[
                            option.value
                          ]
                        }
                      </b>
                    </button>
                  );
                },
              )}
            </div>
          </section>


          {visibleItems.length >
          0 ? (
            <div
              className={
                styles.grid
              }
            >
              {visibleItems.map(
                (
                  item,
                ) => (
                  <ListingCard
                    key={
                      item.listing.id
                    }
                    listing={
                      item.listing
                    }
                    saved
                    saving={
                      removingId ===
                      item.listing.id
                    }
                    onToggleSaved={() =>
                      void remove(
                        item.listing.id,
                      )
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <div
              className={
                styles.filteredEmpty
              }
            >
              <strong>
                Nothing saved in
                this category.
              </strong>

              <span>
                Your other saved
                listings are still
                here — choose
                another filter.
              </span>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}