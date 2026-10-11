"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowDownUp,
  Filter,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  toast,
} from "sonner";

import SponsoredPlacement
  from "@/components/advertising/SponsoredPlacement";

import ListingGrid
  from "@/components/listings/ListingGrid";

import {
  useAuth,
} from "@/context/AuthContext";

import {
  useDialogAccessibility,
} from "@/hooks/use-dialog-accessibility";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  categoriesFor,
} from "@/lib/listing-options";

import {
  engagementService,
} from "@/services/engagement-service";

import {
  listingService,
} from "@/services/listing-service";

import {
  locationService,
} from "@/services/location-service";

import type {
  AreaRead,
} from "@/types/location";

import type {
  Listing,
  ListingSort,
  ListingType,
} from "@/types/listing";

import styles
  from "./ListingExplorer.module.css";


interface FilterState {
  q: string;
  area: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: ListingSort;
}


interface ListingExplorerProps {
  listingType: ListingType;
  eyebrow: string;
  title: string;
  description: string;
}


const PAGE_SIZE = 24;


function normalize(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /-/g,
      "_",
    );
}


function parseSortOption(
  value: string | null,
): ListingSort {
  if (
    value === "newest" ||
    value === "price_low" ||
    value === "price_high"
  ) {
    return value;
  }

  return "recommended";
}


export default function ListingExplorer({
  listingType,
  eyebrow,
  title,
  description,
}: ListingExplorerProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const {
    status,
  } = useAuth();


  const isMarketplace =
    listingType ===
    "marketplace";

  const isProperty =
    listingType ===
    "buy_property";

  const advertisementPlacement =
    isMarketplace
      ? "marketplace"
      : "discovery";


  const categoryOptions =
    useMemo(
      () =>
        categoriesFor(
          listingType,
        ),
      [
        listingType,
      ],
    );


  const initialFilters =
    useMemo<FilterState>(
      () => ({
        q:
          searchParams.get(
            "q",
          ) ?? "",

        area:
          searchParams.get(
            "area",
          ) ?? "",

        category:
          normalize(
            searchParams.get(
              "category",
            ) ?? "",
          ),

        minPrice:
          searchParams.get(
            "min_price",
          ) ?? "",

        maxPrice:
          searchParams.get(
            "max_price",
          ) ?? "",

        sort:
          parseSortOption(
            searchParams.get(
              "sort",
            ),
          ),
      }),
      [
        searchParams,
      ],
    );


  const [
    draft,
    setDraft,
  ] = useState<FilterState>(
    initialFilters,
  );

  const [
    applied,
    setApplied,
  ] = useState<FilterState>(
    initialFilters,
  );


  useEffect(() => {
    setDraft(
      initialFilters,
    );

    setApplied(
      initialFilters,
    );
  }, [
    initialFilters,
  ]);


  const [
    areas,
    setAreas,
  ] = useState<AreaRead[]>(
    [],
  );

  const [
    areasReady,
    setAreasReady,
  ] = useState(
    false,
  );

  const [
    listings,
    setListings,
  ] = useState<Listing[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );

  const [
    loadingMore,
    setLoadingMore,
  ] = useState(
    false,
  );

  const [
    hasMore,
    setHasMore,
  ] = useState(
    false,
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
    filtersOpen,
    setFiltersOpen,
  ] = useState(
    false,
  );

  const [
    savedIds,
    setSavedIds,
  ] = useState<
    Set<string>
  >(
    new Set(),
  );

  const [
    savingId,
    setSavingId,
  ] = useState<
    string | null
  >(
    null,
  );


  const requestVersionRef =
    useRef(0);

  const mobileSheetRef =
    useRef<HTMLElement>(
      null,
    );

  const mobileCloseRef =
    useRef<HTMLButtonElement>(
      null,
    );


  const closeFilters =
    useCallback(() => {
      setFiltersOpen(
        false,
      );
    }, []);


  useDialogAccessibility({
    open:
      filtersOpen,

    containerRef:
      mobileSheetRef,

    initialFocusRef:
      mobileCloseRef,

    onClose:
      closeFilters,
  });


  useEffect(() => {
    let active = true;

    locationService
      .listAreas()
      .then((records) => {
        if (active) {
          setAreas(
            records,
          );
        }
      })
      .catch(() => {
        if (active) {
          setAreas(
            [],
          );
        }
      })
      .finally(() => {
        if (active) {
          setAreasReady(
            true,
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    if (
      status !==
      "authenticated"
    ) {
      setSavedIds(
        new Set(),
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

        setSavedIds(
          new Set(
            records.map(
              (record) =>
                record
                  .listing
                  .id,
            ),
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
    status,
  ]);


  const selectedArea =
    useMemo(() => {
      const target =
        normalize(
          applied.area,
        );

      return areas.find(
        (area) =>
          area.id ===
            applied.area ||
          normalize(
            area.slug,
          ) === target,
      );
    }, [
      areas,
      applied.area,
    ]);


  const loadListings =
    useCallback(
      async (
        signal?: AbortSignal,
        offset = 0,
      ) => {
        if (
          applied.area &&
          !areasReady
        ) {
          return;
        }

        const requestVersion =
          offset === 0
            ? ++requestVersionRef
                .current
            : requestVersionRef
                .current;

        if (
          offset === 0
        ) {
          setLoading(
            true,
          );
        } else {
          setLoadingMore(
            true,
          );
        }

        setError(
          null,
        );

        try {
          const records =
            await listingService.list(
              {
                listing_type:
                  listingType,

                area_id:
                  selectedArea
                    ?.id,

                min_price:
                  applied.minPrice
                    ? Number(
                        applied
                          .minPrice,
                      )
                    : undefined,

                max_price:
                  applied.maxPrice
                    ? Number(
                        applied
                          .maxPrice,
                      )
                    : undefined,

                q:
                  applied.q
                    .trim() ||
                  undefined,

                category:
                  applied
                    .category ||
                  undefined,

                sort:
                  applied.sort,

                limit:
                  PAGE_SIZE + 1,

                offset,
              },
              signal,
            );

          if (
            signal?.aborted ||
            requestVersion !==
              requestVersionRef
                .current
          ) {
            return;
          }

          const page =
            records.slice(
              0,
              PAGE_SIZE,
            );

          setHasMore(
            records.length >
              PAGE_SIZE,
          );

          setListings(
            (current) => {
              if (
                offset === 0
              ) {
                return page;
              }

              const knownIds =
                new Set(
                  current.map(
                    (item) =>
                      item.id,
                  ),
                );

              return [
                ...current,

                ...page.filter(
                  (item) =>
                    !knownIds.has(
                      item.id,
                    ),
                ),
              ];
            },
          );
        } catch (
          requestError
        ) {
          if (
            signal?.aborted ||
            requestVersion !==
              requestVersionRef
                .current
          ) {
            return;
          }

          if (
            offset === 0
          ) {
            setListings(
              [],
            );

            setHasMore(
              false,
            );
          }

          setError(
            getApiErrorMessage(
              requestError,
              "Listings could not be loaded right now.",
            ),
          );
        } finally {
          if (
            !signal?.aborted
          ) {
            if (
              offset === 0
            ) {
              setLoading(
                false,
              );
            } else {
              setLoadingMore(
                false,
              );
            }
          }
        }
      },
      [
        listingType,
        selectedArea?.id,
        applied.area,
        applied.minPrice,
        applied.maxPrice,
        applied.q,
        applied.category,
        applied.sort,
        areasReady,
      ],
    );


  useEffect(() => {
    if (
      applied.area &&
      !areasReady
    ) {
      return;
    }

    const controller =
      new AbortController();

    void loadListings(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [
    applied.area,
    areasReady,
    loadListings,
  ]);


  const updateUrl =
    useCallback(
      (
        filters:
          FilterState,
      ) => {
        const params =
          new URLSearchParams();

        if (
          filters.q.trim()
        ) {
          params.set(
            "q",
            filters.q.trim(),
          );
        }

        if (
          filters.area
        ) {
          params.set(
            "area",
            filters.area,
          );
        }

        if (
          filters.category
        ) {
          params.set(
            "category",
            filters.category,
          );
        }

        if (
          filters.minPrice
        ) {
          params.set(
            "min_price",
            filters.minPrice,
          );
        }

        if (
          filters.maxPrice
        ) {
          params.set(
            "max_price",
            filters.maxPrice,
          );
        }

        if (
          filters.sort !==
          "recommended"
        ) {
          params.set(
            "sort",
            filters.sort,
          );
        }

        const query =
          params.toString();

        router.replace(
          query
            ? `${pathname}?${query}`
            : pathname,
          {
            scroll:
              false,
          },
        );
      },
      [
        pathname,
        router,
      ],
    );


  const applyFilters = (
    event?: FormEvent,
  ) => {
    event
      ?.preventDefault();

    const next = {
      ...draft,

      q:
        draft.q.trim(),
    };

    setDraft(
      next,
    );

    setApplied(
      next,
    );

    updateUrl(
      next,
    );

    closeFilters();
  };


  const applyCategory = (
    category: string,
  ) => {
    const nextDraft = {
      ...draft,
      category,
    };

    const nextApplied = {
      ...applied,
      category,
    };

    setDraft(
      nextDraft,
    );

    setApplied(
      nextApplied,
    );

    updateUrl(
      nextApplied,
    );
  };


  const clearFilters =
    () => {
      const empty:
        FilterState = {
        q: "",
        area: "",
        category: "",
        minPrice: "",
        maxPrice: "",
        sort:
          "recommended",
      };

      setDraft(
        empty,
      );

      setApplied(
        empty,
      );

      router.replace(
        pathname,
        {
          scroll:
            false,
        },
      );

      closeFilters();
    };


  const toggleSaved =
    async (
      listing: Listing,
    ) => {
      if (
        status !==
        "authenticated"
      ) {
        toast.message(
          "Sign in to save listings.",
        );

        router.push(
          `/login?next=${encodeURIComponent(
            `/listings/${listing.id}`,
          )}`,
        );

        return;
      }

      const currentlySaved =
        savedIds.has(
          listing.id,
        );

      setSavingId(
        listing.id,
      );

      try {
        if (
          currentlySaved
        ) {
          await engagementService
            .removeSavedListing(
              listing.id,
            );

          setSavedIds(
            (current) => {
              const next =
                new Set(
                  current,
                );

              next.delete(
                listing.id,
              );

              return next;
            },
          );

          toast.success(
            "Removed from saved listings.",
          );
        } else {
          await engagementService
            .saveListing(
              listing.id,
            );

          setSavedIds(
            (current) =>
              new Set(
                current,
              ).add(
                listing.id,
              ),
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
        setSavingId(
          null,
        );
      }
    };


  const activeFilterCount = [
    applied.q,
    applied.area,
    applied.category,
    applied.minPrice,
    applied.maxPrice,
  ].filter(
    Boolean,
  ).length;


  const searchPlaceholder =
    isMarketplace
      ? "Search furniture, gadgets, appliances, books..."
      : isProperty
        ? "Search property by title, area or features"
        : "Search rentals by title, area or features";


  const resultLabel =
    isMarketplace
      ? "items"
      : "listings";


  const singularResultLabel =
    isMarketplace
      ? "item"
      : "listing";


  const trustTitle =
    isMarketplace
      ? "Buy with more context"
      : "Search with more context";


  const trustDescription =
    isMarketplace
      ? "Check condition, photos and seller details before arranging pickup or payment."
      : "Review listing information and publisher details before you make contact.";


  const sidebarMessage =
    isMarketplace
      ? "Check photos, condition and seller information before arranging payment or pickup."
      : "Compare photos, location and listing details before making an inquiry.";


  const filterFields = (
    <>
      <label className={styles.field}>
        <span>
          Area
        </span>

        <select
          value={draft.area}
          onChange={(event) =>
            setDraft(
              (current) => ({
                ...current,

                area:
                  event.target
                    .value,
              }),
            )
          }
        >
          <option value="">
            All OOU areas
          </option>

          {areas.map(
            (area) => (
              <option
                key={area.id}
                value={
                  area.slug ||
                  area.id
                }
              >
                {area.name}
              </option>
            ),
          )}
        </select>
      </label>


      <label className={styles.field}>
        <span>
          Category
        </span>

        <select
          value={draft.category}
          onChange={(event) =>
            setDraft(
              (current) => ({
                ...current,

                category:
                  event.target
                    .value,
              }),
            )
          }
        >
          <option value="">
            All categories
          </option>

          {categoryOptions.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>
      </label>


      <div className={styles.priceFields}>
        <label className={styles.field}>
          <span>
            Minimum price
          </span>

          <input
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            value={
              draft.minPrice
            }
            onChange={(event) =>
              setDraft(
                (current) => ({
                  ...current,

                  minPrice:
                    event.target
                      .value,
                }),
              )
            }
            placeholder="₦0"
          />
        </label>

        <label className={styles.field}>
          <span>
            Maximum price
          </span>

          <input
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            value={
              draft.maxPrice
            }
            onChange={(event) =>
              setDraft(
                (current) => ({
                  ...current,

                  maxPrice:
                    event.target
                      .value,
                }),
              )
            }
            placeholder="No limit"
          />
        </label>
      </div>
    </>
  );


  return (
    <div
      className={[
        styles.page,

        isMarketplace
          ? styles
              .marketplacePage
          : "",

        isProperty
          ? styles
              .propertyPage
          : "",
      ]
        .filter(
          Boolean,
        )
        .join(
          " ",
        )}
    >
      <section
        className={[
          styles.hero,

          isMarketplace
            ? styles
                .marketplaceHero
            : "",
        ]
          .filter(
            Boolean,
          )
          .join(
            " ",
          )}
      >
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              {eyebrow}
            </span>

            <h1>
              {title}
            </h1>

            <p>
              {description}
            </p>
          </div>

          <div className={styles.trustNote}>
            <span className={styles.trustIcon}>
              <ShieldCheck
                aria-hidden="true"
              />
            </span>

            <div>
              <span>
                {trustTitle}
              </span>

              <p>
                {trustDescription}
              </p>
            </div>
          </div>
        </div>
      </section>


      <section className={styles.searchSection}>
        <form
          className={styles.searchBar}
          onSubmit={applyFilters}
        >
          <Search
            aria-hidden="true"
          />

          <input
            value={draft.q}
            onChange={(event) =>
              setDraft(
                (current) => ({
                  ...current,

                  q:
                    event.target
                      .value,
                }),
              )
            }
            placeholder={
              searchPlaceholder
            }
            aria-label="Search listings"
          />

          <button type="submit">
            Search
          </button>
        </form>


        {isMarketplace ? (
          <div
            className={
              styles.categoryRail
            }
            aria-label={
              "Marketplace categories"
            }
          >
            <button
              type="button"
              className={
                !applied.category
                  ? styles
                      .activeCategory
                  : ""
              }
              onClick={() =>
                applyCategory(
                  "",
                )
              }
              aria-pressed={
                !applied.category
              }
            >
              All items
            </button>

            {categoryOptions
              .slice(
                0,
                7,
              )
              .map(
                (option) => (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    className={
                      applied.category ===
                      option.value
                        ? styles
                            .activeCategory
                        : ""
                    }
                    onClick={() =>
                      applyCategory(
                        option.value,
                      )
                    }
                    aria-pressed={
                      applied.category ===
                      option.value
                    }
                  >
                    {option.label}
                  </button>
                ),
              )}
          </div>
        ) : null}
      </section>


      <SponsoredPlacement
        placement={
          advertisementPlacement
        }
      />


      <section className={styles.content}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeading}>
            <div>
              <SlidersHorizontal
                aria-hidden="true"
              />

              <strong>
                Refine
              </strong>
            </div>

            {activeFilterCount ? (
              <button
                type="button"
                onClick={
                  clearFilters
                }
              >
                Clear
              </button>
            ) : null}
          </div>

          <form
            onSubmit={applyFilters}
            className={styles.filterForm}
          >
            {filterFields}

            <button
              type="submit"
              className={styles.applyButton}
            >
              Apply filters
            </button>
          </form>

          <div className={styles.sidebarNote}>
            <ShieldCheck
              aria-hidden="true"
            />

            <p>
              {sidebarMessage}
            </p>
          </div>
        </aside>


        <div className={styles.results}>
          <div className={styles.resultsToolbar}>
            <div className={styles.resultCount}>
              <span>
                {loading
                  ? "—"
                  : listings.length}
              </span>

              <div>
                <strong>
                  {loading
                    ? `Finding ${resultLabel}`
                    : listings.length === 1
                      ? singularResultLabel
                      : resultLabel}
                </strong>

                <small>
                  {activeFilterCount
                    ? `${activeFilterCount} active ${
                        activeFilterCount === 1
                          ? "filter"
                          : "filters"
                      }`
                    : isMarketplace
                      ? "Recently listed around OOU"
                      : "Available around OOU"}
                </small>
              </div>
            </div>

            <div className={styles.toolbarActions}>
              <button
                type="button"
                className={
                  styles.mobileFilterButton
                }
                onClick={() =>
                  setFiltersOpen(
                    true,
                  )
                }
                aria-haspopup="dialog"
                aria-expanded={
                  filtersOpen
                }
              >
                <Filter
                  aria-hidden="true"
                />

                Filters

                {activeFilterCount ? (
                  <span>
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>

              <label className={styles.sortField}>
                <ArrowDownUp
                  aria-hidden="true"
                />

                <select
                  value={draft.sort}
                  onChange={(event) => {
                    const sort =
                      event.target
                        .value as ListingSort;

                    const nextDraft = {
                      ...draft,
                      sort,
                    };

                    const nextApplied = {
                      ...applied,
                      sort,
                    };

                    setDraft(
                      nextDraft,
                    );

                    setApplied(
                      nextApplied,
                    );

                    updateUrl(
                      nextApplied,
                    );
                  }}
                  aria-label="Sort listings"
                >
                  <option value="recommended">
                    Recommended
                  </option>

                  <option value="newest">
                    Newest first
                  </option>

                  <option value="price_low">
                    Lowest price
                  </option>

                  <option value="price_high">
                    Highest price
                  </option>
                </select>
              </label>
            </div>
          </div>


          {error ? (
            <div
              className={styles.errorBanner}
              role="alert"
            >
              <p>
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadListings()
                }
              >
                Try again
              </button>
            </div>
          ) : null}


          <ListingGrid
            listingType={
              listingType
            }
            listings={
              listings
            }
            loading={
              loading
            }
            savedIds={
              savedIds
            }
            savingId={
              savingId
            }
            onToggleSaved={
              toggleSaved
            }
            onClearFilters={
              clearFilters
            }
          />


          {hasMore ||
          loadingMore ? (
            <div className={styles.loadMoreRow}>
              <button
                type="button"
                className={
                  styles.loadMoreButton
                }
                disabled={
                  loadingMore
                }
                onClick={() =>
                  void loadListings(
                    undefined,
                    listings.length,
                  )
                }
              >
                {loadingMore
                  ? "Loading more…"
                  : `Load more ${resultLabel}`}
              </button>
            </div>
          ) : null}
        </div>
      </section>


      {filtersOpen ? (
        <div
          className={styles.mobileOverlay}
          role="presentation"
        >
          <button
            type="button"
            className={
              styles.mobileBackdrop
            }
            onClick={
              closeFilters
            }
            aria-label="Close filters"
            tabIndex={-1}
          />

          <aside
            ref={
              mobileSheetRef
            }
            className={
              styles.mobileSheet
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              "mobile-filter-title"
            }
            tabIndex={-1}
          >
            <div
              className={
                styles.mobileSheetHeading
              }
            >
              <div>
                <span
                  id={
                    "mobile-filter-title"
                  }
                >
                  Refine results
                </span>

                <small>
                  {activeFilterCount} active
                </small>
              </div>

              <button
                ref={
                  mobileCloseRef
                }
                type="button"
                onClick={
                  closeFilters
                }
                aria-label="Close filters"
              >
                <X
                  aria-hidden="true"
                />
              </button>
            </div>

            <form
              onSubmit={
                applyFilters
              }
              className={
                styles.filterForm
              }
            >
              {filterFields}

              <div
                className={
                  styles.mobileSheetActions
                }
              >
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                >
                  Clear all
                </button>

                <button
                  type="submit"
                >
                  Show results
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}