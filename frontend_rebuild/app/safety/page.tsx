import Link from "next/link";
import {
  BadgeCheck,
  Eye,
  Flag,
  ShieldCheck,
} from "lucide-react";

import styles from "@/components/content/InfoPage.module.css";

export default function SafetyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>
          <ShieldCheck aria-hidden="true" />
          HomeLink safety
        </span>

        <h1>Make informed decisions before money changes hands.</h1>

        <p>
          HomeLink provides verification, moderation, reporting and documented
          inquiry tools. These controls reduce risk, but users must still inspect
          listings, confirm identities and verify documents independently.
        </p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <BadgeCheck aria-hidden="true" />
          </span>
          <h2>Check profile status</h2>
          <p>
            Review whether an agent or landlord profile is approved and compare
            the name, business details and coverage areas with the person you
            contact.
          </p>
          <Link href="/agents">Browse approved profiles</Link>
        </article>

        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <Eye aria-hidden="true" />
          </span>
          <h2>Inspect in person</h2>
          <p>
            Never rely only on photographs. Confirm the property or item exists,
            assess its condition and verify access before making a commitment.
          </p>
          <Link href="/safety/rentals">Read rental safety tips</Link>
        </article>

        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <Flag aria-hidden="true" />
          </span>
          <h2>Report concerns</h2>
          <p>
            Use the report control on a listing when information appears false,
            duplicated, unsafe or inconsistent with what you found during an
            inspection.
          </p>
          <Link href="/support">Get support guidance</Link>
        </article>
      </section>

      <aside className={styles.callout}>
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Approval is not a transaction guarantee.</strong>
          <p>
            HomeLink approval means a profile or listing passed the platform’s
            current review process. It does not replace your own inspection,
            document checks or written agreement.
          </p>
        </div>
      </aside>
    </div>
  );
}