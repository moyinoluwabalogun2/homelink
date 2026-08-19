import Link from "next/link";
import { FileCheck2, KeyRound, MapPin, ShieldCheck } from "lucide-react";

import styles from "@/components/content/InfoPage.module.css";

export default function RentalSafetyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>
          <ShieldCheck aria-hidden="true" />
          Rental safety
        </span>

        <h1>Inspect, verify and document every rental decision.</h1>

        <p>
          A good rental process should leave you with a clear understanding of
          the property, the person offering it, the complete cost and the terms
          governing your stay.
        </p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <MapPin aria-hidden="true" />
          </span>
          <h2>Visit the exact location</h2>
          <p>
            Confirm the street, building, room or unit shown in the listing.
            Inspect water, electricity, access, security and proximity claims.
          </p>
        </article>

        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <FileCheck2 aria-hidden="true" />
          </span>
          <h2>Confirm authority to rent</h2>
          <p>
            Ask for appropriate ownership or management evidence and ensure the
            name receiving payment is connected to the property arrangement.
          </p>
        </article>

        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <KeyRound aria-hidden="true" />
          </span>
          <h2>Get written terms</h2>
          <p>
            Record rent, caution fees, service charges, duration, renewal rules,
            repairs, access arrangements and every amount paid.
          </p>
        </article>
      </section>

      <section className={styles.section}>
        <h2>Before making payment</h2>
        <ul className={styles.list}>
          <li>Compare the inspection with the photos and description.</li>
          <li>Confirm the complete cost, not only the advertised rent.</li>
          <li>Keep messages, receipts and agreements in a safe place.</li>
          <li>Do not allow urgency to replace verification.</li>
          <li>Report material differences through the listing page.</li>
        </ul>
      </section>

      <aside className={styles.callout}>
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Still uncertain about a listing?</strong>
          <p>
            Pause the transaction, review the approved agent directory and use
            the <Link href="/support">support guidance</Link> before proceeding.
          </p>
        </div>
      </aside>
    </div>
  );
}