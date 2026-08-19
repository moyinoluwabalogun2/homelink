"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, List, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  CREDITS_CHANGED_EVENT,
} from "@/services/payment-service";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { getApiErrorMessage } from "@/lib/api-errors";
import { formatCurrency, formatDate, titleCase } from "@/lib/formatters";
import { listingService } from "@/services/listing-service";
import type { Listing } from "@/types/listing";
import shared from "@/components/dashboard/DashboardPage.module.css";
import styles from "./page.module.css";

export default function MyListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try { setItems(await listingService.listMine()); }
    catch (reason) { setError(getApiErrorMessage(reason, "Your listings could not be loaded.")); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

 const submit = async (
  listing: Listing,
) => {
  setWorkingId(
    listing.id,
  );

  try {
    const updated =
      await listingService.submit(
        listing.id,
      );

    setItems(
      (current) =>
        current.map(
          (item) =>
            item.id === updated.id
              ? updated
              : item,
        ),
    );

    window.dispatchEvent(
      new Event(
        CREDITS_CHANGED_EVENT,
      ),
    );

    toast.success(
      "Listing submitted for review.",
    );
  } catch (reason) {
    toast.error(
      getApiErrorMessage(
        reason,
      ),
    );
  } finally {
    setWorkingId(
      null,
    );
  }
};

  const remove = async (listing: Listing) => {
    if (!window.confirm(`Delete “${listing.title}”? This cannot be undone.`)) return;
    setWorkingId(listing.id);
    try {
      await listingService.remove(listing.id);
      setItems((current) => current.filter((item) => item.id !== listing.id));
      toast.success("Listing deleted.");
    } catch (reason) { toast.error(getApiErrorMessage(reason)); }
    finally { setWorkingId(null); }
  };

  return (
    <div className={shared.page}>
      <header className={shared.pageHeader}>
        <div><span className={shared.eyebrow}><List aria-hidden="true" />Inventory</span><h1>My listings.</h1><p>Manage every draft, pending review and published listing from one place.</p></div>
        <Link href="/post-listing" className={shared.primaryButton}><Plus aria-hidden="true" />New listing</Link>
      </header>
      {error ? <div className={shared.error}>{error}</div> : null}
      {loading ? <div className={styles.list}>{Array.from({ length: 4 }, (_, index) => <div key={index} className={styles.skeleton} />)}</div> : null}
      {!loading && items.length === 0 ? <div className={shared.empty}><span className={shared.emptyIcon}><List aria-hidden="true" /></span><h2>No listings yet</h2><p>Create a marketplace item now. Approved agents and landlords can also publish rentals and properties.</p><Link href="/post-listing" className={shared.primaryButton}>Create your first listing</Link></div> : null}
      {!loading && items.length > 0 ? (
        <div className={styles.list}>
          {items.map((listing) => (
            <article key={listing.id} className={styles.row}>
              <div className={styles.mainInfo}><span className={styles.type}>{titleCase(listing.listing_type)}</span><strong>{listing.title}</strong><span>{listing.area.name} · {formatDate(listing.created_at)}</span></div>
              <div className={styles.price}><strong>{formatCurrency(listing.price, listing.currency)}</strong><StatusBadge status={listing.status} /></div>
              <div className={styles.actions}>
                {listing.status === "published" ? <Link href={`/listings/${listing.id}`} title="View listing"><Eye aria-hidden="true" /></Link> : null}
                {(listing.status === "draft" || listing.status === "rejected") ? <button type="button" title="Submit for review" disabled={workingId === listing.id} onClick={() => void submit(listing)}><Send aria-hidden="true" /></button> : null}
                <button type="button" title="Delete listing" disabled={workingId === listing.id} onClick={() => void remove(listing)}><Trash2 aria-hidden="true" /></button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}