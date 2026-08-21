"use client";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  FileWarning,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import styles from "./page.module.css";


const communityUrl =
  process.env
    .NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ??
  "";


export default function SupportPage() {
  const communityAvailable =
    communityUrl.trim().length > 0;

  return (
    <main className={styles.page}>
      {/* =====================================================
          HERO
      ====================================================== */}

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <LifeBuoy aria-hidden="true" />

            Help & support
          </span>

          <h1>
            Need help with
            HomeLink?
          </h1>

          <p>
            Get help with your
            account, listings,
            payments and using
            HomeLink safely.
            Choose the option
            that best matches
            what you need.
          </p>
        </div>

        <div className={styles.heroNote}>
          <ShieldCheck
            aria-hidden="true"
          />

          <div>
            <strong>
              Protect your account
            </strong>

            <span>
              HomeLink will never
              ask for your
              password, OTP, card
              PIN or banking
              authentication
              details.
            </span>
          </div>
        </div>
      </header>


      {/* =====================================================
          PRIMARY SUPPORT
      ====================================================== */}

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>
              Community support
            </span>

            <h2>
              Talk to the
              HomeLink community.
            </h2>
          </div>

          <p>
            Ask general questions,
            discuss accommodation
            and receive important
            HomeLink updates.
          </p>
        </div>

        <div className={styles.communityPanel}>
          <div className={styles.communityIcon}>
            <MessageCircle
              aria-hidden="true"
            />
          </div>

          <div className={styles.communityCopy}>
            <span>
              WhatsApp community
            </span>

            <h3>
              HomeLink Community
              | OOU
            </h3>

            <p>
              Join the official
              community for
              platform help,
              accommodation
              discussions,
              feedback and
              HomeLink
              announcements.
            </p>

            <div className={styles.communityMeta}>
              <span>
                Announcements
              </span>

              <span>
                General community
              </span>

              <span>
                OOU-focused
              </span>
            </div>
          </div>

          <div className={styles.communityAction}>
            {communityAvailable ? (
              <a
                href={communityUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryLink}
              >
                Join on WhatsApp

                <ArrowRight
                  aria-hidden="true"
                />
              </a>
            ) : (
              <span
                className={
                  styles.unavailable
                }
              >
                Community link
                coming soon
              </span>
            )}
          </div>
        </div>

        <aside className={styles.privateNotice}>
          <LockKeyhole
            aria-hidden="true"
          />

          <div>
            <strong>
              Keep sensitive
              issues private.
            </strong>

            <p>
              Do not post payment
              references,
              identification
              documents, account
              credentials or other
              sensitive
              information in a
              public WhatsApp
              group. Use the
              relevant HomeLink
              account, reporting
              or recovery tools
              below.
            </p>
          </div>
        </aside>
      </section>


      {/* =====================================================
          SUPPORT ROUTES
      ====================================================== */}

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>
              Quick help
            </span>

            <h2>
              Choose what you
              need help with.
            </h2>
          </div>

          <p>
            These routes connect
            you to the appropriate
            part of HomeLink
            without exposing
            private information
            publicly.
          </p>
        </div>

        <div className={styles.supportGrid}>
          <article className={styles.supportItem}>
            <div className={styles.itemIcon}>
              <KeyRound
                aria-hidden="true"
              />
            </div>

            <div>
              <h3>
                Account access
              </h3>

              <p>
                Reset your
                password or
                recover access to
                your HomeLink
                account.
              </p>
            </div>

            <Link href="/forgot-password">
              Reset password

              <ArrowRight
                aria-hidden="true"
              />
            </Link>
          </article>


          <article className={styles.supportItem}>
            <div className={styles.itemIcon}>
              <FileWarning
                aria-hidden="true"
              />
            </div>

            <div>
              <h3>
                Suspicious listing
              </h3>

              <p>
                Open the affected
                listing and use
                its report option
                so HomeLink can
                review the correct
                record.
              </p>
            </div>

            <Link href="/rentals">
              Browse listings

              <ArrowRight
                aria-hidden="true"
              />
            </Link>
          </article>


          <article className={styles.supportItem}>
            <div className={styles.itemIcon}>
              <LifeBuoy
                aria-hidden="true"
              />
            </div>

            <div>
              <h3>
                Payments &
                credits
              </h3>

              <p>
                Check your credit
                balance, payment
                status and recent
                HomeLink
                transactions.
              </p>
            </div>

            <Link href="/dashboard/credits">
              Credits & payments

              <ArrowRight
                aria-hidden="true"
              />
            </Link>
          </article>


          <article className={styles.supportItem}>
            <div className={styles.itemIcon}>
              <ShieldCheck
                aria-hidden="true"
              />
            </div>

            <div>
              <h3>
                Safety guidance
              </h3>

              <p>
                Learn how to
                inspect
                accommodation,
                avoid scams and
                protect yourself
                when meeting
                people.
              </p>
            </div>

            <Link href="/safety">
              Safety centre

              <ArrowRight
                aria-hidden="true"
              />
            </Link>
          </article>
        </div>
      </section>


      {/* =====================================================
          COMMON QUESTIONS
      ====================================================== */}

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>
              Common questions
            </span>

            <h2>
              Quick answers.
            </h2>
          </div>
        </div>

        <div className={styles.faqList}>
          <details>
            <summary>
              How do HomeLink
              listing credits
              work?
            </summary>

            <p>
              Free listing credits
              are used first.
              Purchased credits
              are then used only
              for their matching
              listing category.
            </p>
          </details>

          <details>
            <summary>
              Can Marketplace
              credits be used for
              rentals?
            </summary>

            <p>
              No. Marketplace,
              Rental and Property
              credits are
              separate and cannot
              be transferred
              between listing
              types.
            </p>
          </details>

          <details>
            <summary>
              What does a verified
              agent mean?
            </summary>

            <p>
              Verification means
              HomeLink has
              reviewed the
              information and
              documents submitted
              during the
              application
              process. It is not
              a guarantee of every
              future transaction.
            </p>
          </details>

          <details>
            <summary>
              Should I pay for a
              property before
              inspecting it?
            </summary>

            <p>
              Exercise caution.
              Confirm who you are
              dealing with,
              inspect
              accommodation where
              reasonably possible
              and avoid pressure
              to make immediate
              off-platform
              payments.
            </p>
          </details>

          <details>
            <summary>
              Where can I review
              my recent payments?
            </summary>

            <p>
              Open Credits &
              payments from your
              dashboard. Your
              recent HomeLink
              payment attempts and
              their statuses are
              shown there.
            </p>
          </details>
        </div>
      </section>


      {/* =====================================================
          SAFETY CALLOUT
      ====================================================== */}

      <aside className={styles.warning}>
        <AlertTriangle
          aria-hidden="true"
        />

        <div>
          <strong>
            Think something is
            suspicious?
          </strong>

          <p>
            Stop the transaction,
            keep relevant evidence
            and report the
            affected listing or
            account through
            HomeLink. Never send
            passwords, OTPs or
            banking
            authentication
            details to someone
            claiming to be
            HomeLink support.
          </p>
        </div>
      </aside>
    </main>
  );
}