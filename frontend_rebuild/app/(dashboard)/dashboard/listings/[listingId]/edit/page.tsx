"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  FileEdit,
  Loader2,
} from "lucide-react";

import Link from "next/link";

import {
  useParams,
} from "next/navigation";

import ListingEditForm from "@/components/forms/ListingEditForm";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  listingService,
} from "@/services/listing-service";

import type {
  Listing,
} from "@/types/listing";

import styles from "./page.module.css";


export default function EditListingPage() {
  const params =
    useParams<{
      listingId: string;
    }>();

  const listingId =
    Array.isArray(
      params.listingId,
    )
      ? params.listingId[0]
      : params.listingId;

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
  ] = useState("");


  useEffect(
    () => {
      let active = true;

      const load =
        async () => {
          setLoading(true);
          setError("");

          try {
            const result =
              await listingService
                .getMineById(
                  listingId,
                );

            if (!active) {
              return;
            }

            setListing(result);
          } catch (reason) {
            if (!active) {
              return;
            }

            setError(
              getApiErrorMessage(
                reason,
                "This listing could not be opened for editing.",
              ),
            );
          } finally {
            if (active) {
              setLoading(false);
            }
          }
        };

      if (listingId) {
        void load();
      } else {
        setError(
          "The listing identifier is missing.",
        );

        setLoading(false);
      }

      return () => {
        active = false;
      };
    },
    [
      listingId,
    ],
  );


  if (loading) {
    return (
      <div
        className={styles.state}
        role="status"
        aria-live="polite"
      >
        <span
          className={styles.stateIcon}
        >
          <Loader2
            className={styles.spinner}
            aria-hidden="true"
          />
        </span>

        <div>
          <h1>
            Opening your draft
          </h1>

          <p>
            HomeLink is loading the listing
            information and existing media.
          </p>
        </div>
      </div>
    );
  }


  if (
    error ||
    !listing
  ) {
    return (
      <div
        className={styles.state}
      >
        <span
          className={styles.errorIcon}
        >
          <AlertTriangle
            aria-hidden="true"
          />
        </span>

        <div>
          <h1>
            Editor unavailable
          </h1>

          <p>
            {error ||
              "This listing could not be found."}
          </p>

          <Link
            href="/dashboard/listings"
            className={styles.backButton}
          >
            <ArrowLeft
              aria-hidden="true"
            />

            Return to my listings
          </Link>
        </div>
      </div>
    );
  }


  if (
    listing.status !== "draft" &&
    listing.status !== "rejected"
  ) {
    return (
      <div
        className={styles.state}
      >
        <span
          className={styles.errorIcon}
        >
          <FileEdit
            aria-hidden="true"
          />
        </span>

        <div>
          <h1>
            This listing cannot be edited
          </h1>

          <p>
            Only Draft and Rejected listings
            can be changed in this editor.
          </p>

          <Link
            href="/dashboard/listings"
            className={styles.backButton}
          >
            <ArrowLeft
              aria-hidden="true"
            />

            Return to my listings
          </Link>
        </div>
      </div>
    );
  }


  return (
    <ListingEditForm
      listing={listing}
    />
  );
}