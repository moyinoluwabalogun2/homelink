"use client";

import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import styles from "./error.module.css";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.state}>
      <section className={styles.card}>
        <span className={styles.icon}>
          <AlertTriangle aria-hidden="true" />
        </span>

        <h1>Something interrupted this page.</h1>

        <p>
          Your account and data are still safe. Retry the page, or return to the
          HomeLink homepage and continue from there.
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={reset}>
            <RefreshCw aria-hidden="true" />
            Try again
          </button>

          <Link href="/" className={styles.secondary}>
            <Home aria-hidden="true" />
            Go home
          </Link>
        </div>
      </section>
    </div>
  );
}