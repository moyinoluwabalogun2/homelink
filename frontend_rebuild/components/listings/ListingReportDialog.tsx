"use client";

import {
  type FormEvent,
  useCallback,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Flag,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";

import {
  toast,
} from "sonner";

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
  engagementService,
} from "@/services/engagement-service";

import type {
  ListingReportReason,
} from "@/services/engagement-service";

import styles
  from "./ListingReportDialog.module.css";


interface ListingReportDialogProps {
  listingId: string;
  listingTitle: string;
  ownerId: string;
}


const reportReasons: Array<{
  value: ListingReportReason;
  label: string;
}> = [
  {
    value: "fraud",
    label:
      "Suspected fraud or scam",
  },
  {
    value: "misleading",
    label:
      "Misleading information",
  },
  {
    value: "duplicate",
    label:
      "Duplicate listing",
  },
  {
    value: "unavailable",
    label:
      "No longer available",
  },
  {
    value: "inappropriate",
    label:
      "Inappropriate content",
  },
  {
    value: "other",
    label:
      "Another concern",
  },
];


export default function ListingReportDialog({
  listingId,
  listingTitle,
  ownerId,
}: ListingReportDialogProps) {
  const router =
    useRouter();

  const {
    status,
    user,
  } = useAuth();


  const [
    open,
    setOpen,
  ] = useState(
    false,
  );

  const [
    reason,
    setReason,
  ] = useState<
    ListingReportReason
  >(
    "misleading",
  );

  const [
    details,
    setDetails,
  ] = useState(
    "",
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(
    false,
  );


  const dialogRef =
    useRef<HTMLElement>(
      null,
    );

  const closeButtonRef =
    useRef<HTMLButtonElement>(
      null,
    );


  const closeDialog =
    useCallback(() => {
      if (submitting) {
        return;
      }

      setOpen(
        false,
      );
    }, [
      submitting,
    ]);


  useDialogAccessibility({
    open,

    containerRef:
      dialogRef,

    initialFocusRef:
      closeButtonRef,

    onClose:
      closeDialog,
  });


  const isOwner =
    user?.id === ownerId;


  const openDialog =
    () => {
      if (
        status !==
        "authenticated"
      ) {
        toast.message(
          "Sign in to report this listing.",
        );

        router.push(
          `/login?next=${encodeURIComponent(
            `/listings/${listingId}`,
          )}`,
        );

        return;
      }

      if (isOwner) {
        toast.message(
          "You cannot report your own listing.",
        );

        return;
      }

      setOpen(
        true,
      );
    };


  const submitReport =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (submitting) {
        return;
      }

      const cleanedDetails =
        details.trim();

      if (
        cleanedDetails.length >
        3000
      ) {
        toast.error(
          "Report details cannot exceed 3,000 characters.",
        );

        return;
      }

      setSubmitting(
        true,
      );

      try {
        await engagementService
          .reportListing(
            listingId,
            {
              reason,

              details:
                cleanedDetails ||
                null,
            },
          );

        setOpen(
          false,
        );

        setReason(
          "misleading",
        );

        setDetails(
          "",
        );

        toast.success(
          "Thank you. The listing has been reported for review.",
        );
      } catch (
        requestError
      ) {
        toast.error(
          getApiErrorMessage(
            requestError,
            "The report could not be submitted.",
          ),
        );
      } finally {
        setSubmitting(
          false,
        );
      }
    };


  if (isOwner) {
    return null;
  }


  return (
    <>
      <button
        type="button"
        className={
          styles.trigger
        }
        onClick={
          openDialog
        }
      >
        <Flag
          aria-hidden="true"
        />

        Report listing
      </button>


      {open ? (
        <div
          className={
            styles.overlay
          }
          role="presentation"
        >
          <button
            type="button"
            className={
              styles.backdrop
            }
            onClick={
              closeDialog
            }
            aria-label={
              "Close report dialog"
            }
            tabIndex={-1}
          />

          <section
            ref={
              dialogRef
            }
            className={
              styles.dialog
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              "report-listing-title"
            }
            aria-describedby={
              "report-listing-description"
            }
            tabIndex={-1}
          >
            <div
              className={
                styles.heading
              }
            >
              <span
                className={
                  styles.headingIcon
                }
              >
                <ShieldAlert
                  aria-hidden="true"
                />
              </span>

              <div>
                <span>
                  HomeLink safety
                </span>

                <h2
                  id={
                    "report-listing-title"
                  }
                >
                  Report this listing
                </h2>
              </div>

              <button
                ref={
                  closeButtonRef
                }
                type="button"
                className={
                  styles.closeButton
                }
                onClick={
                  closeDialog
                }
                disabled={
                  submitting
                }
                aria-label={
                  "Close report dialog"
                }
              >
                <X
                  aria-hidden="true"
                />
              </button>
            </div>


            <p
              id={
                "report-listing-description"
              }
              className={
                styles.description
              }
            >
              Tell us what appears wrong with
              “{listingTitle}”. Reports are reviewed
              by HomeLink administrators.
            </p>


            <form
              className={
                styles.form
              }
              onSubmit={
                submitReport
              }
            >
              <label>
                <span>
                  Reason
                </span>

                <select
                  value={
                    reason
                  }
                  onChange={
                    (event) =>
                      setReason(
                        event.target
                          .value as ListingReportReason,
                      )
                  }
                >
                  {reportReasons.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              </label>


              <label>
                <span>
                  Additional details
                </span>

                <textarea
                  rows={5}
                  maxLength={3000}
                  value={
                    details
                  }
                  onChange={
                    (event) =>
                      setDetails(
                        event.target
                          .value,
                      )
                  }
                  placeholder={
                    "Share any details that could help our review."
                  }
                />

                <small>
                  {details.length
                    .toLocaleString()}
                  /3,000
                </small>
              </label>


              <div
                className={
                  styles.notice
                }
              >
                <ShieldAlert
                  aria-hidden="true"
                />

                <p>
                  Do not include passwords, payment
                  details or other sensitive information.
                </p>
              </div>


              <div
                className={
                  styles.actions
                }
              >
                <button
                  type="button"
                  onClick={
                    closeDialog
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                >
                  {submitting ? (
                    <Loader2
                      className={
                        styles.spinner
                      }
                      aria-hidden="true"
                    />
                  ) : (
                    <Flag
                      aria-hidden="true"
                    />
                  )}

                  {submitting
                    ? "Submitting…"
                    : "Submit report"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}