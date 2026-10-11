import { Suspense } from "react";

import VerifyEmailClient from "@/components/auth/VerifyEmailClient";
import styles from "@/components/auth/VerifyEmailClient.module.css";

function VerificationFallback() {
  return (
    <section
      className={styles.card}
      aria-busy="true"
      aria-label="Loading email verification"
    >
      <span className={styles.icon}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
      </span>

      <span className={styles.eyebrow}>
        Email verification
      </span>

      <h1>Preparing verification.</h1>

      <p className={styles.message}>
        Please wait while HomeLink prepares your secure verification request.
      </p>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerificationFallback />}>
      <VerifyEmailClient />
    </Suspense>
  );
}