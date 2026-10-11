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
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileClock,
  ImageIcon,
  List,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";

import {
  toast,
} from "sonner";

import StatusBadge from "@/components/dashboard/StatusBadge";

import shared from "@/components/dashboard/DashboardPage.module.css";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatCurrency,
  formatDate,
  titleCase,
} from "@/lib/formatters";

import {
  listingService,
} from "@/services/listing-service";

import {
  CREDITS_CHANGED_EVENT,
} from "@/services/payment-service";

import type {
  Listing,
  ListingStatus,
} from "@/types/listing";

import styles from "./page.module.css";


type FilterKey =
  | "all"
  | "active"
  | "draft"
  | "pending"
  | "completed"
  | "expired"
  | "deleted";


interface FilterOption {
  key: FilterKey;
  label: string;
}


const filters:
  FilterOption[] = [
  {
    key: "all",
    label: "All",
  },
  {
    key: "active",
    label: "Active",
  },
  {
    key: "draft",
    label: "Drafts",
  },
  {
    key: "pending",
    label: "In review",
  },
  {
    key: "completed",
    label: "Completed",
  },
  {
    key: "expired",
    label: "Expired",
  },
  {
    key: "deleted",
    label: "Recently deleted",
  },
];


const completedStatuses =
  new Set<ListingStatus>([
    "sold",
    "rented",
  ]);


function canEdit(
  listing: Listing,
): boolean {
  return (
    listing.status ===
      "draft"
    ||
    listing.status ===
      "rejected"
  );
}


function canUndoCompletion(
  listing: Listing,
): boolean {
  if (
    !completedStatuses.has(
      listing.status,
    )
    ||
    !listing.completed_at
  ) {
    return false;
  }

  const completedTime =
    new Date(
      listing.completed_at,
    ).getTime();

  if (
    !Number.isFinite(
      completedTime,
    )
  ) {
    return false;
  }

  const twentyFourHours =
    24
    *
    60
    *
    60
    *
    1_000;

  return (
    Date.now() -
      completedTime
    <=
    twentyFourHours
  );
}


function listingTypeLabel(
  listing: Listing,
): string {
  if (
    listing.listing_type ===
    "buy_property"
  ) {
    return "Property";
  }

  return titleCase(
    listing.listing_type,
  );
}


function completionLabel(
  listing: Listing,
): string {
  return (
    listing.listing_type ===
    "rental"
      ? "Mark as rented"
      : "Mark as sold"
  );
}


function listingImage(
  listing: Listing,
): string | null {
  const cover =
    listing.media.find(
      (item) =>
        item.media_type ===
          "image"
        &&
        item.is_cover,
    );

  const firstImage =
    listing.media.find(
      (item) =>
        item.media_type ===
        "image",
    );

  return (
    cover?.url
    ??
    firstImage?.url
    ??
    null
  );
}


export default function MyListingsPage() {
  const [
    items,
    setItems,
  ] = useState<Listing[]>([]);

  const [
    deletedItems,
    setDeletedItems,
  ] = useState<Listing[]>([]);

  const [
    selectedFilter,
    setSelectedFilter,
  ] = useState<FilterKey>(
    "all",
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    workingId,
    setWorkingId,
  ] = useState<string | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    completionTarget,
    setCompletionTarget,
  ] = useState<Listing | null>(
    null,
  );

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<Listing | null>(
    null,
  );


  const requestVersionRef =
    useRef(0);

  const modalCloseRef =
    useRef<HTMLButtonElement>(
      null,
    );


  const operationBusy =
    workingId !== null;

  const dialogOpen =
    completionTarget !== null
    ||
    deleteTarget !== null;


  const load =
    useCallback(
      async () => {
        const requestVersion =
          ++requestVersionRef.current;

        setLoading(true);
        setError("");

        try {
          const [
            activeResult,
            deletedResult,
          ] = await Promise.all([
            listingService
              .listMine(),

            listingService
              .listRecentlyDeleted(),
          ]);

          if (
            requestVersion !==
            requestVersionRef.current
          ) {
            return;
          }

          setItems(
            activeResult,
          );

          setDeletedItems(
            deletedResult,
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
              "Your listings could not be loaded.",
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
    void load();

    return () => {
      requestVersionRef.current +=
        1;
    };
  }, [
    load,
  ]);


  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    modalCloseRef
      .current
      ?.focus();

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
          "Escape"
        &&
        !operationBusy
      ) {
        setCompletionTarget(
          null,
        );

        setDeleteTarget(
          null,
        );
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    dialogOpen,
    operationBusy,
  ]);


  const counts =
    useMemo(
      () => ({
        all:
          items.length,

        active:
          items.filter(
            (item) =>
              item.status ===
              "published",
          ).length,

        draft:
          items.filter(
            (item) =>
              item.status ===
                "draft"
              ||
              item.status ===
                "rejected",
          ).length,

        pending:
          items.filter(
            (item) =>
              item.status ===
              "pending",
          ).length,

        completed:
          items.filter(
            (item) =>
              completedStatuses.has(
                item.status,
              ),
          ).length,

        expired:
          items.filter(
            (item) =>
              item.status ===
              "expired",
          ).length,

        deleted:
          deletedItems.length,
      }),
      [
        items,
        deletedItems,
      ],
    );


  const visibleItems =
    useMemo(
      () => {
        if (
          selectedFilter ===
          "deleted"
        ) {
          return deletedItems;
        }

        if (
          selectedFilter ===
          "all"
        ) {
          return items;
        }

        if (
          selectedFilter ===
          "active"
        ) {
          return items.filter(
            (item) =>
              item.status ===
              "published",
          );
        }

        if (
          selectedFilter ===
          "draft"
        ) {
          return items.filter(
            (item) =>
              item.status ===
                "draft"
              ||
              item.status ===
                "rejected",
          );
        }

        if (
          selectedFilter ===
          "pending"
        ) {
          return items.filter(
            (item) =>
              item.status ===
              "pending",
          );
        }

        if (
          selectedFilter ===
          "completed"
        ) {
          return items.filter(
            (item) =>
              completedStatuses.has(
                item.status,
              ),
          );
        }

        return items.filter(
          (item) =>
            item.status ===
            "expired",
        );
      },
      [
        selectedFilter,
        items,
        deletedItems,
      ],
    );


  const updateItem = (
    updated: Listing,
  ) => {
    setItems(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            updated.id
              ? updated
              : item,
        ),
    );
  };


  const submit =
    async (
      listing: Listing,
    ) => {
      if (operationBusy) {
        return;
      }

      setWorkingId(
        listing.id,
      );

      try {
        const updated =
          await listingService
            .submit(
              listing.id,
            );

        updateItem(
          updated,
        );

        window.dispatchEvent(
          new Event(
            CREDITS_CHANGED_EVENT,
          ),
        );

        toast.success(
          "Listing submitted for review.",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "The listing could not be submitted.",
          ),
        );
      } finally {
        setWorkingId(
          null,
        );
      }
    };


  const complete =
    async () => {
      if (
        !completionTarget
        ||
        operationBusy
      ) {
        return;
      }

      const target =
        completionTarget;

      setWorkingId(
        target.id,
      );

      try {
        const updated =
          await listingService
            .complete(
              target.id,
            );

        updateItem(
          updated,
        );

        setCompletionTarget(
          null,
        );

        toast.success(
          target.listing_type ===
            "rental"
            ? "Listing marked as rented."
            : "Listing marked as sold.",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "The listing could not be updated.",
          ),
        );
      } finally {
        setWorkingId(
          null,
        );
      }
    };


  const reopen =
    async (
      listing: Listing,
    ) => {
      if (operationBusy) {
        return;
      }

      setWorkingId(
        listing.id,
      );

      try {
        const updated =
          await listingService
            .reopen(
              listing.id,
            );

        updateItem(
          updated,
        );

        toast.success(
          "Listing returned to active.",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "The listing could not be reopened.",
          ),
        );
      } finally {
        setWorkingId(
          null,
        );
      }
    };


  const remove =
    async () => {
      if (
        !deleteTarget
        ||
        operationBusy
      ) {
        return;
      }

      const target =
        deleteTarget;

      setWorkingId(
        target.id,
      );

      try {
        await listingService
          .remove(
            target.id,
          );

        setItems(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                target.id,
            ),
        );

        setDeleteTarget(
          null,
        );

        /*
         * Refresh only the deleted collection.
         * This avoids reloading both listing
         * collections after deletion.
         */
        try {
          const deleted =
            await listingService
              .listRecentlyDeleted();

          setDeletedItems(
            deleted,
          );
        } catch {
          /*
           * The deletion already succeeded.
           * A future page refresh will recover
           * the deleted collection.
           */
        }

        toast.success(
          "Listing moved to Recently Deleted.",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "The listing could not be deleted.",
          ),
        );
      } finally {
        setWorkingId(
          null,
        );
      }
    };


  const restore =
    async (
      listing: Listing,
    ) => {
      if (operationBusy) {
        return;
      }

      setWorkingId(
        listing.id,
      );

      try {
        const restored =
          await listingService
            .restore(
              listing.id,
            );

        setDeletedItems(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                listing.id,
            ),
        );

        setItems(
          (current) => [
            restored,
            ...current.filter(
              (item) =>
                item.id !==
                restored.id,
            ),
          ],
        );

        toast.success(
          "Listing restored. No credit was used.",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "The listing could not be restored.",
          ),
        );
      } finally {
        setWorkingId(
          null,
        );
      }
    };


  return (
    <div
      className={
        shared.page
      }
    >
      <header
        className={
          shared.pageHeader
        }
      >
        <div>
          <span
            className={
              shared.eyebrow
            }
          >
            <List
              aria-hidden="true"
            />

            Listing workspace
          </span>

          <h1>
            My listings.
          </h1>

          <p>
            Manage drafts, approvals,
            published listings, completed
            deals and recently deleted
            items from one workspace.
          </p>
        </div>

        <Link
          href="/post-listing"
          className={
            shared.primaryButton
          }
        >
          <Plus
            aria-hidden="true"
          />

          Add listing
        </Link>
      </header>


      {error ? (
        <div
          className={
            styles.error
          }
          role="alert"
        >
          <AlertTriangle
            aria-hidden="true"
          />

          <div>
            <strong>
              Could not load listings.
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              void load()
            }
            disabled={loading}
          >
            <RefreshCcw
              className={
                loading
                  ? styles.spinner
                  : undefined
              }
              aria-hidden="true"
            />

            {loading
              ? "Retrying…"
              : "Retry"}
          </button>
        </div>
      ) : null}


      <section
        className={
          styles.filterSection
        }
        aria-label={
          "Listing workspace filters"
        }
      >
        <div
          className={
            styles.filterHeading
          }
        >
          <div>
            <span>
              Your inventory
            </span>

            <strong>
              {visibleItems.length}
              {" "}
              {visibleItems.length ===
              1
                ? "listing"
                : "listings"}
            </strong>
          </div>

          <p>
            Select a status to narrow
            your workspace.
          </p>
        </div>

        <div
          className={
            styles.filters
          }
          aria-label={
            "Listing filters"
          }
        >
          {filters.map(
            (filter) => {
              const selected =
                selectedFilter ===
                filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  className={
                    selected
                      ? styles.activeFilter
                      : undefined
                  }
                  aria-pressed={
                    selected
                  }
                  onClick={() => {
                    setSelectedFilter(
                      filter.key,
                    );
                  }}
                >
                  <span>
                    {filter.label}
                  </span>

                  <strong>
                    {counts[
                      filter.key
                    ]}
                  </strong>
                </button>
              );
            },
          )}
        </div>
      </section>


      {loading ? (
        <div
          className={
            styles.list
          }
          role="status"
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
            Loading your listings…
          </span>

          {[1, 2, 3].map(
            (item) => (
              <div
                key={item}
                className={
                  styles.skeleton
                }
                aria-hidden="true"
              />
            ),
          )}
        </div>
      ) : visibleItems.length ===
        0 ? (
        <section
          className={
            styles.empty
          }
          aria-live="polite"
        >
          <span>
            {selectedFilter ===
            "deleted" ? (
              <Trash2
                aria-hidden="true"
              />
            ) : (
              <FileClock
                aria-hidden="true"
              />
            )}
          </span>

          <h2>
            {selectedFilter ===
            "deleted"
              ? "Recently Deleted is empty."
              : "No listings in this section."}
          </h2>

          <p>
            {selectedFilter ===
            "deleted"
              ? "Listings you remove remain recoverable here for 30 days before their media is permanently removed."
              : "Create a new listing or select another status to continue."}
          </p>

          {selectedFilter !==
          "deleted" ? (
            <Link
              href="/post-listing"
              className={
                styles.emptyButton
              }
            >
              <Plus
                aria-hidden="true"
              />

              Create listing
            </Link>
          ) : null}
        </section>
      ) : (
        <div
          className={
            styles.list
          }
          role="list"
          aria-label={
            "Your listings"
          }
        >
          {visibleItems.map(
            (listing) => {
              const isDeleted =
                selectedFilter ===
                "deleted";

              const isWorking =
                workingId ===
                listing.id;

              const image =
                listingImage(
                  listing,
                );

              return (
                <article
                  key={listing.id}
                  className={
                    styles.row
                  }
                  role="listitem"
                  aria-busy={
                    isWorking
                  }
                >
                  <div
                    className={
                      styles.media
                    }
                    style={
                      image
                        ? {
                            backgroundImage:
                              `url("${image}")`,
                          }
                        : undefined
                    }
                    aria-hidden="true"
                  >
                    {!image ? (
                      <ImageIcon />
                    ) : null}
                  </div>


                  <div
                    className={
                      styles.mainInfo
                    }
                  >
                    <span
                      className={
                        styles.type
                      }
                    >
                      {listingTypeLabel(
                        listing,
                      )}
                    </span>

                    <strong>
                      {listing.title}
                    </strong>

                    <span>
                      {listing.area.name}
                      {" · "}
                      Updated{" "}
                      {formatDate(
                        listing.updated_at,
                      )}
                    </span>

                    {listing.status ===
                      "rejected"
                    &&
                    listing
                      .rejection_reason ? (
                      <p
                        className={
                          styles.rejection
                        }
                        title={
                          listing
                            .rejection_reason
                        }
                      >
                        Review note:{" "}
                        {
                          listing
                            .rejection_reason
                        }
                      </p>
                    ) : null}

                    {isDeleted ? (
                      <p
                        className={
                          styles.deletedNote
                        }
                      >
                        {listing
                          .media_purge_after
                          ? (
                              <>
                                Recoverable until{" "}
                                {formatDate(
                                  listing
                                    .media_purge_after,
                                )}
                              </>
                            )
                          : "Temporarily recoverable"}
                      </p>
                    ) : null}
                  </div>


                  <div
                    className={
                      styles.price
                    }
                  >
                    <strong>
                      {formatCurrency(
                        listing.price,
                        listing.currency,
                      )}
                    </strong>

                    {isDeleted ? (
                      <span
                        className={
                          styles.deletedBadge
                        }
                      >
                        Recently deleted
                      </span>
                    ) : (
                      <StatusBadge
                        status={
                          listing.status
                        }
                      />
                    )}
                  </div>


                  <div
                    className={
                      styles.actions
                    }
                  >
                    {isWorking ? (
                      <span
                        className={
                          styles.workingIndicator
                        }
                        role="status"
                        aria-label={
                          "Updating listing"
                        }
                      >
                        <Loader2
                          aria-hidden="true"
                        />
                      </span>
                    ) : null}


                    {isDeleted ? (
                      <button
                        type="button"
                        className={
                          styles.restoreAction
                        }
                        title={
                          "Restore listing"
                        }
                        aria-label={
                          `Restore ${listing.title}`
                        }
                        disabled={
                          operationBusy
                        }
                        onClick={() =>
                          void restore(
                            listing,
                          )
                        }
                      >
                        <RotateCcw
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      <>
                        {listing.status ===
                        "published" ? (
                          <Link
                            href={
                              `/listings/${listing.id}`
                            }
                            title={
                              "View listing"
                            }
                            aria-label={
                              `View ${listing.title}`
                            }
                          >
                            <Eye
                              aria-hidden="true"
                            />
                          </Link>
                        ) : null}


                        {canEdit(
                          listing,
                        ) ? (
                          <Link
                            href={
                              `/dashboard/listings/${listing.id}/edit`
                            }
                            className={
                              styles.editAction
                            }
                            title={
                              "Edit listing"
                            }
                            aria-label={
                              `Edit ${listing.title}`
                            }
                          >
                            <Pencil
                              aria-hidden="true"
                            />
                          </Link>
                        ) : null}


                        {listing.status ===
                        "draft" ? (
                          <button
                            type="button"
                            className={
                              styles.submitAction
                            }
                            title={
                              "Submit for review"
                            }
                            aria-label={
                              `Submit ${listing.title} for review`
                            }
                            disabled={
                              operationBusy
                            }
                            onClick={() =>
                              void submit(
                                listing,
                              )
                            }
                          >
                            <Send
                              aria-hidden="true"
                            />
                          </button>
                        ) : null}


                        {listing.status ===
                        "published" ? (
                          <button
                            type="button"
                            className={
                              styles.completeAction
                            }
                            title={
                              completionLabel(
                                listing,
                              )
                            }
                            aria-label={
                              completionLabel(
                                listing,
                              )
                            }
                            disabled={
                              operationBusy
                            }
                            onClick={() => {
                              setCompletionTarget(
                                listing,
                              );
                            }}
                          >
                            <CheckCircle2
                              aria-hidden="true"
                            />
                          </button>
                        ) : null}


                        {canUndoCompletion(
                          listing,
                        ) ? (
                          <button
                            type="button"
                            className={
                              styles.undoAction
                            }
                            title={
                              "Undo completion"
                            }
                            aria-label={
                              `Undo completion for ${listing.title}`
                            }
                            disabled={
                              operationBusy
                            }
                            onClick={() =>
                              void reopen(
                                listing,
                              )
                            }
                          >
                            <RotateCcw
                              aria-hidden="true"
                            />
                          </button>
                        ) : null}


                        <button
                          type="button"
                          className={
                            styles.deleteAction
                          }
                          title={
                            "Delete listing"
                          }
                          aria-label={
                            `Delete ${listing.title}`
                          }
                          disabled={
                            operationBusy
                          }
                          onClick={() => {
                            setDeleteTarget(
                              listing,
                            );
                          }}
                        >
                          <Trash2
                            aria-hidden="true"
                          />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}


      {completionTarget ? (
        <div
          className={
            styles.modalBackdrop
          }
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget
              &&
              !operationBusy
            ) {
              setCompletionTarget(
                null,
              );
            }
          }}
        >
          <section
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              "completion-title"
            }
            aria-describedby={
              "completion-description"
            }
          >
            <button
              ref={modalCloseRef}
              type="button"
              className={
                styles.modalClose
              }
              aria-label={
                "Close completion confirmation"
              }
              disabled={
                operationBusy
              }
              onClick={() => {
                setCompletionTarget(
                  null,
                );
              }}
            >
              <X
                aria-hidden="true"
              />
            </button>

            <span
              className={
                styles.modalIcon
              }
            >
              <CheckCircle2
                aria-hidden="true"
              />
            </span>

            <h2
              id={
                "completion-title"
              }
            >
              {completionTarget
                .listing_type ===
              "rental"
                ? "Has this property been rented?"
                : "Has this listing been sold?"}
            </h2>

            <p
              id={
                "completion-description"
              }
            >
              “{
                completionTarget.title
              }” will move to Completed
              and disappear from public
              search. This does not use
              or refund a credit.
            </p>

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                disabled={
                  operationBusy
                }
                onClick={() => {
                  setCompletionTarget(
                    null,
                  );
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  styles.confirmButton
                }
                disabled={
                  operationBusy
                }
                onClick={() =>
                  void complete()
                }
              >
                {workingId ===
                completionTarget.id ? (
                  <>
                    <Loader2
                      className={
                        styles.spinner
                      }
                      aria-hidden="true"
                    />

                    Updating…
                  </>
                ) : (
                  completionTarget
                    .listing_type ===
                  "rental"
                    ? "Mark as rented"
                    : "Mark as sold"
                )}
              </button>
            </div>

            <small>
              You can undo this action
              for 24 hours.
            </small>
          </section>
        </div>
      ) : null}


      {deleteTarget ? (
        <div
          className={
            styles.modalBackdrop
          }
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget
              &&
              !operationBusy
            ) {
              setDeleteTarget(
                null,
              );
            }
          }}
        >
          <section
            className={`
              ${styles.modal}
              ${styles.deleteModal}
            `}
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              "delete-listing-title"
            }
            aria-describedby={
              "delete-listing-description"
            }
          >
            <button
              ref={modalCloseRef}
              type="button"
              className={
                styles.modalClose
              }
              aria-label={
                "Close deletion confirmation"
              }
              disabled={
                operationBusy
              }
              onClick={() => {
                setDeleteTarget(
                  null,
                );
              }}
            >
              <X
                aria-hidden="true"
              />
            </button>

            <span
              className={
                styles.modalIcon
              }
            >
              <Trash2
                aria-hidden="true"
              />
            </span>

            <h2
              id={
                "delete-listing-title"
              }
            >
              Move listing to Recently
              Deleted?
            </h2>

            <p
              id={
                "delete-listing-description"
              }
            >
              “{deleteTarget.title}”
              will disappear from your
              active workspace and public
              search. You can restore it
              for 30 days.
            </p>

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                disabled={
                  operationBusy
                }
                onClick={() => {
                  setDeleteTarget(
                    null,
                  );
                }}
              >
                Keep listing
              </button>

              <button
                type="button"
                className={
                  styles.deleteConfirmButton
                }
                disabled={
                  operationBusy
                }
                onClick={() =>
                  void remove()
                }
              >
                {workingId ===
                deleteTarget.id ? (
                  <>
                    <Loader2
                      className={
                        styles.spinner
                      }
                      aria-hidden="true"
                    />

                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2
                      aria-hidden="true"
                    />

                    Move to deleted
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}