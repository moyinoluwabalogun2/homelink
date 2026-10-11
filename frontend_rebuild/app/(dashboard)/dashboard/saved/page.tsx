"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowRight,
  Bookmark,
  BookmarkX,
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


interface FilterDefinition {
  value: SavedFilter;
  label: string;
  icon: typeof Bookmark;
}


const filters: FilterDefinition[] = [
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
  ] = useState<SavedListing[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    removingId,
    setRemovingId,
  ] = useState<string | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState<SavedFilter>(
    "all",
  );

  const requestVersionRef =
    useRef(0);

  const pendingRemovalIdsRef =
    useRef<Set<string>>(
      new Set(),
    );


  /* =========================================================
     LOAD SAVED LISTINGS
  ========================================================= */

  const loadSaved =
    useCallback(
      async () => {
        const requestVersion =
          ++requestVersionRef.current;

        setLoading(true);
        setError("");

        try {
          const records =
            await engagementService
              .listSaved();

          if (
            requestVersion !==
            requestVersionRef.current
          ) {
            return;
          }

          setItems(
            records.filter(
              (item) =>
                !pendingRemovalIdsRef
                  .current
                  .has(
                    item.listing.id,
                  ),
            ),
          );
        } catch (reason) {
          if (
            requestVersion !==
            requestVersionRef.current
          ) {
            return;
          }

          setError(
            getApiErrorMessage(
              reason,
              "Saved listings could not be loaded.",
            ),
          );
        } finally {
          if (
            requestVersion ===
            requestVersionRef.current
          ) {
            setLoading(false);
          }
        }
      },
      [],
    );


  useEffect(() => {
    void loadSaved();

    return () => {
      requestVersionRef.current += 1;
    };
  }, [
    loadSaved,
  ]);


  /* =========================================================
     REMOVE SAVED LISTING
  ========================================================= */

  const remove =
    async (
      listingId: string,
    ) => {
      if (
        removingId !== null ||
        pendingRemovalIdsRef
          .current
          .has(listingId)
      ) {
        return;
      }

      pendingRemovalIdsRef
        .current
        .add(listingId);

      setRemovingId(
        listingId,
      );

      try {
        await engagementService
          .removeSavedListing(
            listingId,
          );

        setItems(
          (current) =>
            current.filter(
              (item) =>
                item.listing.id !==
                listingId,
            ),
        );

        toast.success(
          "Removed from saved listings.",
        );
      } catch (reason) {
        pendingRemovalIdsRef
          .current
          .delete(listingId);

        toast.error(
          getApiErrorMessage(
            reason,
            "Could not remove this saved listing.",
          ),
        );
      } finally {
        setRemovingId(
          (current) =>
            current === listingId
              ? null
              : current,
        );
      }
    };


  /* =========================================================
     FILTERING
  ========================================================= */

  const counts =
    useMemo<
      Record<
        SavedFilter,
        number
      >
    >(
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
      [
        items,
      ],
    );


  const visibleItems =
    useMemo(
      () => {
        if (
          filter === "all"
        ) {
          return items;
        }

        return items.filter(
          (item) =>
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


  const activeFilter =
    filters.find(
      (item) =>
        item.value === filter,
    );


  return (
    <div
      className={styles.page}
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header
        className={styles.header}
      >
        <div>
          <span
            className={styles.eyebrow}
          >
            <Bookmark
              aria-hidden="true"
            />

            Saved listings
          </span>

          <h1>
            Your shortlist.
          </h1>

          <p>
            Keep rentals, properties
            and marketplace finds
            together while you compare
            your options.
          </p>
        </div>

        {!loading &&
        !error ? (
          <div
            className={styles.savedCount}
            aria-label={
              `${items.length} ${
                items.length === 1
                  ? "saved listing"
                  : "saved listings"
              }`
            }
          >
            <strong>
              {items.length}
            </strong>

            <span>
              {items.length === 1
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
        <section
          className={styles.error}
          role="alert"
        >
          <div>
            <strong>
              Couldn&apos;t load your
              shortlist.
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void loadSaved();
            }}
          >
            <RefreshCw
              aria-hidden="true"
              className={
                loading
                  ? styles.spinner
                  : undefined
              }
            />

            {loading
              ? "Trying again…"
              : "Try again"}
          </button>
        </section>
      ) : null}


      {/* =====================================================
          LOADING
      ====================================================== */}

      {loading ? (
        <div
          className={styles.grid}
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={
            "Loading saved listings"
          }
        >
          <span
            className={styles.srOnly}
          >
            Loading saved listings…
          </span>

          {Array.from(
            {
              length: 6,
            },
            (
              _,
              index,
            ) => (
              <div
                key={index}
                className={styles.skeleton}
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
          )}
        </div>
      ) : null}


      {/* =====================================================
          MAIN EMPTY STATE
      ====================================================== */}

      {!loading &&
      !error &&
      items.length === 0 ? (
        <section
          className={styles.empty}
          aria-labelledby={
            "saved-empty-title"
          }
        >
          <span
            className={styles.emptyIcon}
          >
            <BookmarkX
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

          <h2
            id="saved-empty-title"
          >
            Build a shortlist as
            you browse.
          </h2>

          <p>
            Save any rental, property
            or marketplace listing and
            it will appear here whenever
            you want to revisit it.
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

              <ArrowRight
                aria-hidden="true"
              />
            </Link>

            <Link
              href="/buy-property"
              className={
                styles.secondaryAction
              }
            >
              View property
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
            className={styles.toolbar}
            aria-label={
              "Saved listing filters"
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
              className={styles.filters}
              role="group"
              aria-label={
                "Filter saved listings by type"
              }
            >
              {filters.map(
                (option) => {
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
                          : undefined
                      }
                      aria-pressed={active}
                      onClick={() => {
                        setFilter(
                          option.value,
                        );
                      }}
                    >
                      <Icon
                        aria-hidden="true"
                      />

                      <span>
                        {option.label}
                      </span>

                      <b
                        aria-label={
                          `${
                            counts[
                              option.value
                            ]
                          } listings`
                        }
                      >
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

          <div
            className={styles.resultMeta}
            aria-live="polite"
          >
            <span>
              {activeFilter?.label ??
                "Saved listings"}
            </span>

            <strong>
              {visibleItems.length}{" "}
              {visibleItems.length === 1
                ? "result"
                : "results"}
            </strong>
          </div>

          {visibleItems.length > 0 ? (
            <div
              className={styles.grid}
              role="list"
              aria-label={
                activeFilter
                  ? `${activeFilter.label} listings`
                  : "Saved listings"
              }
            >
              {visibleItems.map(
                (item) => (
                  <div
                    key={
                      item.listing.id
                    }
                    className={
                      styles.gridItem
                    }
                    role="listitem"
                  >
                    <ListingCard
                      listing={
                        item.listing
                      }
                      saved
                      saving={
                        removingId ===
                        item.listing.id
                      }
                      onToggleSaved={() => {
                        void remove(
                          item.listing.id,
                        );
                      }}
                    />
                  </div>
                ),
              )}
            </div>
          ) : (
            <section
              className={
                styles.filteredEmpty
              }
              aria-live="polite"
            >
              <span
                className={
                  styles.filteredEmptyIcon
                }
              >
                <Search
                  aria-hidden="true"
                />
              </span>

              <div>
                <strong>
                  Nothing saved in this
                  category.
                </strong>

                <p>
                  Your other saved listings
                  are still here. Choose
                  another filter to see them.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                }}
              >
                Show all saved
              </button>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}