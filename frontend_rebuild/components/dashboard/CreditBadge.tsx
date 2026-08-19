"use client";

import Link from "next/link";

import {
  Coins,
  RefreshCw,
} from "lucide-react";

import styles from "./CreditBadge.module.css";


interface CreditBadgeProps {
  marketplaceCredits:
    | number
    | null;

  loading?: boolean;
}


export default function CreditBadge({
  marketplaceCredits,
  loading = false,
}: CreditBadgeProps) {
  return (
    <Link
      href="/dashboard/credits"
      className={
        styles.badge
      }
      aria-label="View marketplace posting credits"
      title="Marketplace posting credits"
    >
      <span
        className={
          styles.icon
        }
      >
        {loading ? (
          <RefreshCw
            aria-hidden="true"
            className={
              styles.loadingIcon
            }
          />
        ) : (
          <Coins
            aria-hidden="true"
          />
        )}
      </span>


      <span
        className={
          styles.copy
        }
      >
        <small>
          Marketplace
        </small>

        <strong>
          {loading
            ? "Loading…"
            : marketplaceCredits ===
                null
              ? "Unavailable"
              : `${marketplaceCredits} ${
                  marketplaceCredits ===
                  1
                    ? "credit"
                    : "credits"
                }`}
        </strong>
      </span>
    </Link>
  );
}