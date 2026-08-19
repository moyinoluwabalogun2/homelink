import Link from "next/link";
import { ArrowLeft, Home, MapPinned } from "lucide-react";

import styles from "./error.module.css";

export default function NotFoundPage() {
  return (
    <div className={styles.state}>
      <section className={styles.card}>
        <span className={styles.icon}>
          <MapPinned aria-hidden="true" />
        </span>

        <h1>This page is not available.</h1>

        <p>
          The address may be incorrect, or the page may have moved as HomeLink
          continues to grow.
        </p>

        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>
            <Home aria-hidden="true" />
            Go home
          </Link>

          <Link href="/rentals" className={styles.secondary}>
            <ArrowLeft aria-hidden="true" />
            Browse rentals
          </Link>
        </div>
      </section>
    </div>
  );
}