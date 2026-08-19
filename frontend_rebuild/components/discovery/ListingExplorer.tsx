"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
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

import { toast } from "sonner";

import ListingGrid from "@/components/listings/ListingGrid";

import { useAuth } from "@/context/AuthContext";

import { getApiErrorMessage } from "@/lib/api-errors";
import { categoriesFor } from "@/lib/listing-options";
import { toNumber } from "@/lib/formatters";

import { engagementService } from "@/services/engagement-service";
import { listingService } from "@/services/listing-service";
import { locationService } from "@/services/location-service";

import type { AreaRead } from "@/types/location";

import type {
  Listing,
  ListingType,
} from "@/types/listing";

import styles from "./ListingExplorer.module.css";


type SortOption =
  | "recommended"
  | "newest"
  | "price_low"
  | "price_high";


interface FilterState {
  q: string;
  area: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: SortOption;
}


interface ListingExplorerProps {
  listingType: ListingType;
  eyebrow: string;
  title: string;
  description: string;
}


function listingCategory(
  listing: Listing,
): string {
  return (
    listing.rental_details?.category ??
    listing.buy_property_details?.category ??
    listing.marketplace_details?.category ??
    ""
  );
}


function normalize(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
}


export default function ListingExplorer({
  listingType,
  eyebrow,
  title,
  description,
}: ListingExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { status } =
    useAuth();


  const isMarketplace =
    listingType ===
    "marketplace";

  const isProperty =
    listingType ===
    "buy_property";


  const categoryOptions =
    categoriesFor(
      listingType,
    );


  const initialFilters =
    useMemo<FilterState>(
      () => ({
        q:
          searchParams.get("q") ??
          "",

        area:
          searchParams.get("area") ??
          "",

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
          (searchParams.get(
            "sort",
          ) as
            | SortOption
            | null) ??
          "recommended",
      }),
      [searchParams],
    );


  const [
    draft,
    setDraft,
  ] =
    useState<FilterState>(
      initialFilters,
    );


  const [
    applied,
    setApplied,
  ] =
    useState<FilterState>(
      initialFilters,
    );


  const [
    areas,
    setAreas,
  ] =
    useState<AreaRead[]>([]);


  const [
    listings,
    setListings,
  ] =
    useState<Listing[]>([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);


  const [
    filtersOpen,
    setFiltersOpen,
  ] =
    useState(false);


  const [
    savedIds,
    setSavedIds,
  ] =
    useState<Set<string>>(
      new Set(),
    );


  const [
    savingId,
    setSavingId,
  ] =
    useState<
      string | null
    >(null);


  /* =========================================================
     AREAS
  ========================================================= */

  useEffect(() => {
    let active = true;

    locationService
      .listAreas()
      .then((records) => {
        if (active) {
          setAreas(records);
        }
      })
      .catch(() => {
        if (active) {
          setAreas([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);


  /* =========================================================
     SAVED LISTINGS
  ========================================================= */

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
                record.listing.id,
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
  }, [status]);


  /* =========================================================
     AREA RESOLUTION
  ========================================================= */

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


  /* =========================================================
     LOAD LISTINGS
  ========================================================= */

  const loadListings =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const records =
            await listingService.list(
              {
                listing_type:
                  listingType,

                area_id:
                  selectedArea?.id,

                min_price:
                  applied.minPrice
                    ? Number(
                        applied.minPrice,
                      )
                    : undefined,

                max_price:
                  applied.maxPrice
                    ? Number(
                        applied.maxPrice,
                      )
                    : undefined,

                q:
                  applied.q.trim() ||
                  undefined,

                limit: 100,
              },
            );

          setListings(
            records,
          );
        } catch (
          requestError
        ) {
          setListings([]);

          setError(
            getApiErrorMessage(
              requestError,
              "Listings could not be loaded right now.",
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [
        listingType,
        selectedArea?.id,
        applied.minPrice,
        applied.maxPrice,
        applied.q,
      ],
    );


  useEffect(() => {
    void loadListings();
  }, [loadListings]);


  /* =========================================================
     FILTER + SORT
  ========================================================= */

  const visibleListings =
    useMemo(() => {
      const category =
        normalize(
          applied.category,
        );

      const filtered =
        category
          ? listings.filter(
              (listing) =>
                normalize(
                  listingCategory(
                    listing,
                  ),
                ) ===
                category,
            )
          : [...listings];


      if (
        applied.sort ===
        "price_low"
      ) {
        filtered.sort(
          (a, b) =>
            toNumber(
              a.price,
            ) -
            toNumber(
              b.price,
            ),
        );
      } else if (
        applied.sort ===
        "price_high"
      ) {
        filtered.sort(
          (a, b) =>
            toNumber(
              b.price,
            ) -
            toNumber(
              a.price,
            ),
        );
      } else if (
        applied.sort ===
        "newest"
      ) {
        filtered.sort(
          (a, b) =>
            new Date(
              b.published_at ??
                b.created_at,
            ).getTime() -
            new Date(
              a.published_at ??
                a.created_at,
            ).getTime(),
        );
      }

      return filtered;
    }, [
      listings,
      applied.category,
      applied.sort,
    ]);


  /* =========================================================
     URL STATE
  ========================================================= */

  const updateUrl = (
    filters: FilterState,
  ) => {
    const params =
      new URLSearchParams();


    if (filters.q.trim()) {
      params.set(
        "q",
        filters.q.trim(),
      );
    }


    if (filters.area) {
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
        scroll: false,
      },
    );
  };


  /* =========================================================
     APPLY
  ========================================================= */

  const applyFilters = (
    event?: FormEvent,
  ) => {
    event?.preventDefault();

    setApplied(draft);
    updateUrl(draft);

    setFiltersOpen(
      false,
    );
  };


  /* =========================================================
     CATEGORY QUICK FILTER
  ========================================================= */

  const applyCategory = (
    category: string,
  ) => {
    const next = {
      ...draft,
      category,
    };

    setDraft(next);

    setApplied(
      (current) => ({
        ...current,
        category,
      }),
    );

    updateUrl({
      ...applied,
      category,
    });
  };


  /* =========================================================
     CLEAR
  ========================================================= */

  const clearFilters =
    () => {
      const empty: FilterState =
        {
          q: "",
          area: "",
          category: "",
          minPrice: "",
          maxPrice: "",
          sort:
            "recommended",
        };

      setDraft(empty);
      setApplied(empty);

      router.replace(
        pathname,
        {
          scroll: false,
        },
      );
    };


  /* =========================================================
     SAVE
  ========================================================= */

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
          await engagementService.removeSavedListing(
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
          await engagementService.saveListing(
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
        setSavingId(null);
      }
    };


  const activeFilterCount =
    [
      applied.q,
      applied.area,
      applied.category,
      applied.minPrice,
      applied.maxPrice,
    ].filter(Boolean)
      .length;


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


  /* =========================================================
     FILTER FIELDS
  ========================================================= */

  const filterFields = (
    <>
      <label
        className={
          styles.field
        }
      >
        <span>
          Area
        </span>

        <select
          value={
            draft.area
          }
          onChange={(
            event,
          ) =>
            setDraft(
              (
                current,
              ) => ({
                ...current,

                area:
                  event
                    .target
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
                key={
                  area.id
                }
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


      <label
        className={
          styles.field
        }
      >
        <span>
          Category
        </span>

        <select
          value={
            draft.category
          }
          onChange={(
            event,
          ) =>
            setDraft(
              (
                current,
              ) => ({
                ...current,

                category:
                  event
                    .target
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
                key={
                  option.value
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


      <div
        className={
          styles.priceFields
        }
      >
        <label
          className={
            styles.field
          }
        >
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
            onChange={(
              event,
            ) =>
              setDraft(
                (
                  current,
                ) => ({
                  ...current,

                  minPrice:
                    event
                      .target
                      .value,
                }),
              )
            }
            placeholder="₦0"
          />
        </label>


        <label
          className={
            styles.field
          }
        >
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
            onChange={(
              event,
            ) =>
              setDraft(
                (
                  current,
                ) => ({
                  ...current,

                  maxPrice:
                    event
                      .target
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
          ? styles.marketplacePage
          : "",

        isProperty
          ? styles.propertyPage
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ===================================================
          PAGE INTRO
      ==================================================== */}

      <section
        className={[
          styles.hero,

          isMarketplace
            ? styles.marketplaceHero
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={
            styles.heroInner
          }
        >
          <div
            className={
              styles.heroCopy
            }
          >
            <span
              className={
                styles.eyebrow
              }
            >
              {eyebrow}
            </span>

            <h1>
              {title}
            </h1>

            <p>
              {description}
            </p>
          </div>


          <div
            className={
              styles.trustNote
            }
          >
            <span
              className={
                styles.trustIcon
              }
            >
              <ShieldCheck
                aria-hidden="true"
              />
            </span>

            <div>
              <span>
                {trustTitle}
              </span>

              <p>
                {
                  trustDescription
                }
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ===================================================
          SEARCH
      ==================================================== */}

      <section
        className={
          styles.searchSection
        }
      >
        <form
          className={
            styles.searchBar
          }
          onSubmit={
            applyFilters
          }
        >
          <Search
            aria-hidden="true"
          />

          <input
            value={
              draft.q
            }
            onChange={(
              event,
            ) =>
              setDraft(
                (
                  current,
                ) => ({
                  ...current,

                  q:
                    event
                      .target
                      .value,
                }),
              )
            }
            placeholder={
              searchPlaceholder
            }
            aria-label="Search listings"
          />

          <button
            type="submit"
          >
            Search
          </button>
        </form>


        {/* ===============================================
            MARKETPLACE QUICK CATEGORIES
        ================================================ */}

        {isMarketplace ? (
          <div
            className={
              styles.categoryRail
            }
          >
            <button
              type="button"
              className={
                !applied.category
                  ? styles.activeCategory
                  : ""
              }
              onClick={() =>
                applyCategory("")
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
                        ? styles.activeCategory
                        : ""
                    }
                    onClick={() =>
                      applyCategory(
                        option.value,
                      )
                    }
                  >
                    {
                      option.label
                    }
                  </button>
                ),
              )}
          </div>
        ) : null}
      </section>


      {/* ===================================================
          EXPLORER
      ==================================================== */}

      <section
        className={
          styles.content
        }
      >
        <aside
          className={
            styles.sidebar
          }
        >
          <div
            className={
              styles.sidebarHeading
            }
          >
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
            onSubmit={
              applyFilters
            }
            className={
              styles.filterForm
            }
          >
            {filterFields}

            <button
              type="submit"
              className={
                styles.applyButton
              }
            >
              Apply filters
            </button>
          </form>


          <div
            className={
              styles.sidebarNote
            }
          >
            <ShieldCheck
              aria-hidden="true"
            />

            <p>
              {
                sidebarMessage
              }
            </p>
          </div>
        </aside>


        <div
          className={
            styles.results
          }
        >
          <div
            className={
              styles.resultsToolbar
            }
          >
            <div
              className={
                styles.resultCount
              }
            >
              <span>
                {loading
                  ? "—"
                  : visibleListings.length}
              </span>

              <div>
                <strong>
                  {loading
                    ? `Finding ${resultLabel}`
                    : visibleListings.length ===
                        1
                      ? resultLabel ===
                          "items"
                        ? "item"
                        : "listing"
                      : resultLabel}
                </strong>

                <small>
                  {activeFilterCount
                    ? `${activeFilterCount} active ${
                        activeFilterCount ===
                        1
                          ? "filter"
                          : "filters"
                      }`
                    : isMarketplace
                      ? "Recently listed around OOU"
                      : "Available around OOU"}
                </small>
              </div>
            </div>


            <div
              className={
                styles.toolbarActions
              }
            >
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
              >
                <Filter
                  aria-hidden="true"
                />

                Filters

                {activeFilterCount ? (
                  <span>
                    {
                      activeFilterCount
                    }
                  </span>
                ) : null}
              </button>


              <label
                className={
                  styles.sortField
                }
              >
                <ArrowDownUp
                  aria-hidden="true"
                />

                <select
                  value={
                    draft.sort
                  }
                  onChange={(
                    event,
                  ) => {
                    const sort =
                      event
                        .target
                        .value as SortOption;

                    const next = {
                      ...draft,
                      sort,
                    };

                    setDraft(next);

                    setApplied(
                      (
                        current,
                      ) => ({
                        ...current,
                        sort,
                      }),
                    );

                    updateUrl({
                      ...applied,
                      sort,
                    });
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
              className={
                styles.errorBanner
              }
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
    visibleListings
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
        </div>
      </section>


      {/* ===================================================
          MOBILE FILTERS
      ==================================================== */}

      {filtersOpen ? (
        <div
          className={
            styles.mobileOverlay
          }
          role="presentation"
        >
          <button
            className={
              styles.mobileBackdrop
            }
            onClick={() =>
              setFiltersOpen(
                false,
              )
            }
            aria-label="Close filters"
          />

          <aside
            className={
              styles.mobileSheet
            }
            aria-label="Listing filters"
          >
            <div
              className={
                styles.mobileSheetHeading
              }
            >
              <div>
                <span>
                  Refine results
                </span>

                <small>
                  {
                    activeFilterCount
                  }{" "}
                  active
                </small>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFiltersOpen(
                    false,
                  )
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