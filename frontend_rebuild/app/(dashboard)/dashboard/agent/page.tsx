"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Home,
  Inbox,
  List,
  MapPin,
  MessageSquare,
  Plus,
  ShieldCheck,
} from "lucide-react";

import shared from "@/components/dashboard/DashboardPage.module.css";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { getApiErrorMessage } from "@/lib/api-errors";
import { formatDate, titleCase } from "@/lib/formatters";
import { agentService } from "@/services/agent-service";
import { dashboardService } from "@/services/dashboard-service";
import { engagementService } from "@/services/engagement-service";
import type {
  AgentApplicationProfile,
} from "@/types/agent";
import type { UserDashboardSummary } from "@/types/dashboard";
import type { Inquiry } from "@/types/engagement";

import styles from "./page.module.css";

export default function AgentWorkspacePage() {
  const [profile, setProfile] = useState<AgentApplicationProfile | null>(null);
  const [summary, setSummary] = useState<UserDashboardSummary | null>(null);
  const [leads, setLeads] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      agentService.getMine(),
      dashboardService.getSummary(),
      engagementService.listReceivedInquiries(),
    ])
      .then(([agentProfile, dashboardSummary, incoming]) => {
        setProfile(agentProfile);
        setSummary(dashboardSummary);
        setLeads(incoming);
      })
      .catch((reason) => {
        setError(
          getApiErrorMessage(reason, "Your agent workspace could not be loaded."),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const publishedListings = useMemo(
    () => summary?.listings_by_status.published ?? 0,
    [summary],
  );

  const openLeads = useMemo(
    () => leads.filter((lead) => lead.status === "open").length,
    [leads],
  );

  if (loading) {
    return (
      <div className={shared.page}>
        <div className={shared.loadingGrid}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={shared.skeleton} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <span className={shared.eyebrow}>
            <ShieldCheck aria-hidden="true" />
            Verified workspace
          </span>
          <h1>Manage your property activity.</h1>
          <p>
            Keep listings accurate, respond to prospective renters quickly and
            maintain a trusted HomeLink profile.
          </p>
        </div>
        <Link href="/post-listing" className={shared.primaryButton}>
          <Plus aria-hidden="true" />
          Add listing
        </Link>
      </header>

      {error ? <div className={shared.error}>{error}</div> : null}

      <section className={shared.statsGrid}>
        <article className={shared.statCard}>
          <span className={shared.statIcon}>
            <List aria-hidden="true" />
          </span>
          <strong>{publishedListings}</strong>
          <span>Published listings</span>
        </article>
        <article className={shared.statCard}>
          <span className={shared.statIcon}>
            <Inbox aria-hidden="true" />
          </span>
          <strong>{openLeads}</strong>
          <span>Open leads</span>
        </article>
        <article className={shared.statCard}>
          <span className={shared.statIcon}>
            <MessageSquare aria-hidden="true" />
          </span>
          <strong>{summary?.received_inquiries ?? 0}</strong>
          <span>Total inquiries</span>
        </article>
        <article className={shared.statCard}>
          <span className={shared.statIcon}>
            <CheckCircle2 aria-hidden="true" />
          </span>
          <strong>{profile?.years_experience ?? 0}</strong>
          <span>Years of experience</span>
        </article>
      </section>

      <section className={styles.profileGrid}>
        <article className={styles.profileCard}>
          <div className={styles.profileHeading}>
            <span>
              <Building2 aria-hidden="true" />
            </span>
            <div>
              <small>{titleCase(profile?.agent_type ?? "agent")}</small>
              <h2>{profile?.business_name || profile?.user.full_name}</h2>
            </div>
            <StatusBadge status={profile?.status ?? "pending"} />
          </div>

          <p>{profile?.bio || "Your verified profile information will appear here."}</p>

          <div className={styles.areaList}>
            {(profile?.coverage_areas ?? []).map((coverage) => (
              <span key={coverage.area.id}>
                <MapPin aria-hidden="true" />
                {coverage.area.name}
              </span>
            ))}
          </div>

          <div className={styles.profileMeta}>
            <div>
              <span>Approved</span>
              <strong>
                {profile?.approved_at ? formatDate(profile.approved_at) : "Pending"}
              </strong>
            </div>
            <div>
              <span>Documents</span>
              <strong>{profile?.documents.length ?? 0}</strong>
            </div>
          </div>
        </article>

        <article className={shared.panel}>
          <div className={shared.panelHeader}>
            <h2>Agent actions</h2>
          </div>
          <div className={shared.quickGrid}>
            <Link href="/post-listing/rental" className={shared.quickCard}>
              <Home aria-hidden="true" />
              <strong>Post rental</strong>
              <span>Create a rental draft with complete property details.</span>
            </Link>
            <Link href="/post-listing/property" className={shared.quickCard}>
              <Building2 aria-hidden="true" />
              <strong>Post property</strong>
              <span>List land, houses and commercial spaces for sale.</span>
            </Link>
            <Link href="/dashboard/leads" className={shared.quickCard}>
              <Inbox aria-hidden="true" />
              <strong>Review leads</strong>
              <span>Respond to open inquiries and inspection requests.</span>
            </Link>
            <Link href="/dashboard/listings" className={shared.quickCard}>
              <List aria-hidden="true" />
              <strong>Manage inventory</strong>
              <span>Review draft, pending, published and rejected listings.</span>
            </Link>
          </div>
        </article>
      </section>

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>Recent incoming leads</h2>
          <Link href="/dashboard/leads">View all</Link>
        </div>

        {leads.length === 0 ? (
          <div className={styles.compactEmpty}>
            <Inbox aria-hidden="true" />
            <div>
              <strong>No incoming leads yet</strong>
              <span>New inquiries will appear as soon as users contact you.</span>
            </div>
          </div>
        ) : (
          <div className={styles.leadList}>
            {leads.slice(0, 4).map((lead) => (
              <article key={lead.id} className={styles.leadRow}>
                <div>
                  <strong>{lead.sender.full_name}</strong>
                  <span>{lead.listing.title}</span>
                </div>
                <StatusBadge status={lead.status} />
                <time>{formatDate(lead.created_at)}</time>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}