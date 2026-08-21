import Link from "next/link";

import {
  BadgeCheck,
  CreditCard,
  Eye,
  Flag,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
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

        <h1>
          Verify first.
          Pay second.
        </h1>

        <p>
          HomeLink provides
          verification,
          moderation and
          reporting tools to
          reduce risk, but safe
          decisions still require
          you to inspect,
          confirm identities and
          understand what you are
          paying for.
        </p>
      </header>


      <section className={styles.grid}>
        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <BadgeCheck
              aria-hidden="true"
            />
          </span>

          <h2>
            Check the profile
          </h2>

          <p>
            Compare the name,
            contact information,
            business details and
            coverage area shown
            on HomeLink with the
            person you are
            actually dealing
            with.
          </p>

          <Link href="/agents">
            Browse approved
            agents
          </Link>
        </article>


        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <Eye
              aria-hidden="true"
            />
          </span>

          <h2>
            Inspect before
            committing
          </h2>

          <p>
            Do not rely only on
            photographs or
            messages. Confirm
            that accommodation,
            property or an item
            exists and matches
            its description.
          </p>

          <Link href="/safety/rentals">
            Rental safety guide
          </Link>
        </article>


        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <CreditCard
              aria-hidden="true"
            />
          </span>

          <h2>
            Understand payments
          </h2>

          <p>
            HomeLink posting
            credits are payments
            to HomeLink. Rent,
            deposits, property
            payments and
            marketplace payments
            sent directly to
            another user are
            separate
            transactions.
          </p>

          <Link href="/dashboard/credits">
            Payment history
          </Link>
        </article>


        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <KeyRound
              aria-hidden="true"
            />
          </span>

          <h2>
            Protect your account
          </h2>

          <p>
            Never give another
            person your HomeLink
            password, OTP, card
            PIN or banking
            authentication
            details — including
            someone claiming to
            work for HomeLink.
          </p>

          <Link href="/support">
            Account support
          </Link>
        </article>


        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <ShoppingBag
              aria-hidden="true"
            />
          </span>

          <h2>
            Marketplace safely
          </h2>

          <p>
            Check an items
            actual condition,
            model and ownership
            before paying.
            Arrange meetings in
            sensible locations
            and avoid unnecessary
            advance payments.
          </p>

          <Link href="/marketplace">
            Browse marketplace
          </Link>
        </article>


        <article className={styles.card}>
          <span className={styles.cardIcon}>
            <Flag
              aria-hidden="true"
            />
          </span>

          <h2>
            Report concerns
          </h2>

          <p>
            Report listings that
            appear false,
            duplicated,
            unavailable,
            suspicious or
            materially different
            from what you found
            during inspection.
          </p>

          <Link href="/support">
            Support guidance
          </Link>
        </article>
      </section>


      <section className={styles.section}>
        <h2>
          Common warning signs
        </h2>

        <ul className={styles.list}>
          <li>
            You are pressured to
            pay immediately
            because several other
            people are supposedly
            waiting.
          </li>

          <li>
            The person refuses a
            reasonable inspection
            or cannot explain
            their connection to
            the property.
          </li>

          <li>
            The property, item,
            price or contact
            details are
            significantly
            different from the
            HomeLink listing.
          </li>

          <li>
            Someone asks you to
            send an OTP, password,
            card PIN or banking
            authentication code.
          </li>

          <li>
            Payment is requested
            to an unrelated name
            and the person cannot
            reasonably explain
            why.
          </li>

          <li>
            Documents contain
            obvious alterations,
            inconsistent names or
            details that cannot
            reasonably be
            confirmed.
          </li>
        </ul>
      </section>


      <aside className={styles.callout}>
        <ShieldAlert
          aria-hidden="true"
        />

        <div>
          <strong>
            Verified does not
            mean guaranteed.
          </strong>

          <p>
            A verified HomeLink
            profile means
            information or
            documents submitted
            by that user passed
            HomeLinks current
            review process. It
            does not guarantee
            every property,
            representation or
            transaction they may
            later offer.
          </p>
        </div>
      </aside>


      <aside className={styles.callout}>
        <ShieldCheck
          aria-hidden="true"
        />

        <div>
          <strong>
            If something feels
            seriously wrong,
            stop the transaction.
          </strong>

          <p>
            Keep relevant
            evidence, avoid
            sending more money
            and report the
            affected listing or
            account through
            HomeLink. If there is
            an immediate threat
            to your physical
            safety, contact the
            appropriate local
            emergency authority.
          </p>
        </div>
      </aside>
    </div>
  );
}