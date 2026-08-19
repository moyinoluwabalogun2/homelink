"use client";

import Link from "next/link";
import { Building2, Home, Plus, Store } from "lucide-react";

import shared from "@/components/dashboard/DashboardPage.module.css";
import { useAuth } from "@/context/AuthContext";

import styles from "./page.module.css";

export default function PostListingPage() {
  const { user } = useAuth();
  const canPostProperty = user?.role === "agent" || user?.role === "admin";

  return (
    <div className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <span className={shared.eyebrow}>
            <Plus aria-hidden="true" />
            Create
          </span>
          <h1>What are you listing?</h1>
          <p>
            Choose the correct category so students, renters and buyers can find
            your listing quickly.
          </p>
        </div>
      </header>

      <section className={styles.grid}>
        <Link href="/post-listing/marketplace" className={styles.card}>
          <span>
            <Store aria-hidden="true" />
          </span>
          <div>
            <strong>Marketplace item</strong>
            <p>
              Sell phones, laptops, furniture, books, fashion and other student
              essentials.
            </p>
            <b>Available to every member</b>
          </div>
        </Link>

        {canPostProperty ? (
          <Link href="/post-listing/rental" className={styles.card}>
            <span>
              <Home aria-hidden="true" />
            </span>
            <div>
              <strong>Rental</strong>
              <p>
                Publish hostels, rooms, self-contained apartments, flats and
                houses.
              </p>
              <b>Agent or landlord workspace</b>
            </div>
          </Link>
        ) : (
          <div className={`${styles.card} ${styles.locked}`}>
            <span>
              <Home aria-hidden="true" />
            </span>
            <div>
              <strong>Rental</strong>
              <p>
                Publish hostels, rooms, self-contained apartments, flats and
                houses.
              </p>
              <b>Approved agent or landlord required</b>
            </div>
          </div>
        )}

        {canPostProperty ? (
          <Link href="/post-listing/property" className={styles.card}>
            <span>
              <Building2 aria-hidden="true" />
            </span>
            <div>
              <strong>Property for sale</strong>
              <p>
                List land, houses, commercial properties, offices and
                warehouses.
              </p>
              <b>Agent or landlord workspace</b>
            </div>
          </Link>
        ) : (
          <div className={`${styles.card} ${styles.locked}`}>
            <span>
              <Building2 aria-hidden="true" />
            </span>
            <div>
              <strong>Property for sale</strong>
              <p>
                List land, houses, commercial properties, offices and
                warehouses.
              </p>
              <b>Approved agent or landlord required</b>
            </div>
          </div>
        )}
      </section>

      {!canPostProperty ? (
        <aside className={styles.notice}>
          <div>
            <strong>Need to post rentals or properties?</strong>
            <p>
              Complete the HomeLink agent or landlord verification process first.
            </p>
          </div>
          <Link
            href="/dashboard/agent-application"
            className={shared.secondaryButton}
          >
            Start verification
          </Link>
        </aside>
      ) : null}
    </div>
  );
}