"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, Inbox, MessageSquare, XCircle } from "lucide-react";
import { toast } from "sonner";

import shared from "@/components/dashboard/DashboardPage.module.css";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { getApiErrorMessage } from "@/lib/api-errors";
import { formatDate, titleCase } from "@/lib/formatters";
import { engagementService } from "@/services/engagement-service";
import type { Inquiry, InquiryStatus } from "@/types/engagement";

import styles from "./page.module.css";

type LeadFilter = "all" | InquiryStatus;

export default function LeadsPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState<LeadFilter>("open");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    engagementService
      .listReceivedInquiries()
      .then(setItems)
      .catch((reason) =>
        setError(getApiErrorMessage(reason, "Incoming leads could not be loaded.")),
      )
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () =>
      filter === "all" ? items : items.filter((item) => item.status === filter),
    [filter, items],
  );

  const update = async (inquiry: Inquiry, status: InquiryStatus) => {
    setWorkingId(inquiry.id);
    try {
      const updated = await engagementService.updateInquiryStatus(
        inquiry.id,
        status,
      );
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(`Inquiry marked as ${titleCase(status)}.`);
    } catch (reason) {
      toast.error(getApiErrorMessage(reason));
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <span className={shared.eyebrow}>
            <Inbox aria-hidden="true" />
            Lead management
          </span>
          <h1>Incoming property inquiries.</h1>
          <p>
            Review questions and inspection requests, then keep each lead status
            current so nothing important gets lost.
          </p>
        </div>
      </header>

      <div className={shared.tabs} role="tablist" aria-label="Lead status filter">
        {(["open", "responded", "closed", "all"] as LeadFilter[]).map(
          (status) => (
            <button
              key={status}
              type="button"
              className={filter === status ? shared.activeTab : ""}
              onClick={() => setFilter(status)}
            >
              {titleCase(status)}
            </button>
          ),
        )}
      </div>

      {error ? <div className={shared.error}>{error}</div> : null}

      {loading ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={styles.skeleton} />
          ))}
        </div>
      ) : null}

      {!loading && visible.length === 0 ? (
        <div className={shared.empty}>
          <span className={shared.emptyIcon}>
            <Inbox aria-hidden="true" />
          </span>
          <h2>No {filter === "all" ? "" : `${filter} `}leads</h2>
          <p>Incoming inquiries matching this status will appear here.</p>
        </div>
      ) : null}

      {!loading && visible.length > 0 ? (
        <div className={styles.list}>
          {visible.map((inquiry) => (
            <article key={inquiry.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <span>{titleCase(inquiry.inquiry_type)}</span>
                  <h2>{inquiry.listing.title}</h2>
                </div>
                <StatusBadge status={inquiry.status} />
              </div>

              <blockquote>{inquiry.message}</blockquote>

              <div className={styles.senderRow}>
                <div>
                  <strong>{inquiry.sender.full_name}</strong>
                  <span>Received {formatDate(inquiry.created_at)}</span>
                </div>
                <Link href={`/listings/${inquiry.listing.id}`}>
                  <Eye aria-hidden="true" />
                  View listing
                </Link>
              </div>

              <div className={styles.actions}>
                {inquiry.status === "open" ? (
                  <button
                    type="button"
                    disabled={workingId === inquiry.id}
                    onClick={() => void update(inquiry, "responded")}
                  >
                    <MessageSquare aria-hidden="true" />
                    Mark responded
                  </button>
                ) : null}
                {inquiry.status !== "closed" ? (
                  <button
                    type="button"
                    disabled={workingId === inquiry.id}
                    onClick={() => void update(inquiry, "closed")}
                  >
                    <CheckCircle2 aria-hidden="true" />
                    Close lead
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={workingId === inquiry.id}
                    onClick={() => void update(inquiry, "open")}
                  >
                    <XCircle aria-hidden="true" />
                    Reopen
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}