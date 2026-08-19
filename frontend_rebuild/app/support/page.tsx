import Link from "next/link";
import {
  FileWarning,
  KeyRound,
  LifeBuoy,
  HelpCircle,
} from "lucide-react";

import styles from "@/components/content/InfoPage.module.css";

export default function SupportPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>
          <LifeBuoy aria-hidden="true" />
          Help and support
        </span>

        <h1>Start with the support route that matches the issue.</h1>

        <p>
          HomeLink keeps account, listing and transaction concerns separated so
          the correct records can be reviewed. Use the options below while the
          full support-ticket workflow is being prepared.
        </p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <KeyRound aria-hidden="true" />
          </span>
          <h2>Account access</h2>
          <p>
            Use password reset first. Signed-in users can change their password,
            export account data or manage deletion from Account settings.
          </p>
          <Link href="/forgot-password">Reset password</Link>
        </article>

        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <FileWarning aria-hidden="true" />
          </span>
          <h2>Listing concern</h2>
          <p>
            Open the affected listing and use its report control. This connects
            the concern to the correct listing record for moderation.
          </p>
          <Link href="/rentals">Find the listing</Link>
        </article>

        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <HelpCircle aria-hidden="true" />
          </span>
          <h2>Privacy or legal request</h2>
          <p>
            The current privacy notice contains the configured contact address
            for data-protection questions and requests.
          </p>
          <Link href="/privacy">Open privacy notice</Link>
        </article>
      </section>

      <aside className={styles.callout}>
        <LifeBuoy aria-hidden="true" />
        <div>
          <strong>Support-ticket forms are not live yet.</strong>
          <p>
            This page intentionally avoids pretending to submit a ticket before
            a dedicated backend support workflow exists.
          </p>
        </div>
      </aside>
    </div>
  );
}