import { api } from "@/lib/api";

import type {
  AccountStatus,
  UserRole,
} from "@/types/auth";

import type {
  AgentApplicationProfile,
  AgentApplicationStatus,
} from "@/types/agent";

import type {
  AdminDashboardSummary,
  AdminUser,
  AdminUserFilters,
  AuditLog,
  AuditLogFilters,
  ListingReport,
  MaintenanceResult,
  ReportStatus,
  SystemReadiness,
} from "@/types/admin";

import type {
  Listing,
} from "@/types/listing";


export interface AgentDocumentAccessResponse {
  url: string;
  expires_in_seconds: number;
  download: boolean;
}


export const adminService = {
  async getDashboardSummary():
    Promise<AdminDashboardSummary> {
    const response =
      await api.get<AdminDashboardSummary>(
        "/admin/dashboard/summary",
      );

    return response.data;
  },


  async listPendingListings():
    Promise<Listing[]> {
    const response =
      await api.get<Listing[]>(
        "/admin/listings/pending",
      );

    return response.data;
  },


  async approveListing(
    listingId: string,
  ): Promise<Listing> {
    const response =
      await api.post<Listing>(
        `/admin/listings/${listingId}/approve`,
      );

    return response.data;
  },


  async rejectListing(
    listingId: string,
    reason: string,
  ): Promise<Listing> {
    const response =
      await api.post<Listing>(
        `/admin/listings/${listingId}/reject`,
        {
          reason,
        },
      );

    return response.data;
  },


  /* =======================================================
     AGENT APPLICATIONS
  ======================================================= */

  async listAgentApplications(
    status:
      AgentApplicationStatus =
        "pending",
  ): Promise<
    AgentApplicationProfile[]
  > {
    const response =
      await api.get<
        AgentApplicationProfile[]
      >(
        "/admin/agent-applications",
        {
          params: {
            status,
          },
        },
      );

    return response.data;
  },


  async approveAgent(
    profileId: string,
  ): Promise<
    AgentApplicationProfile
  > {
    const response =
      await api.post<
        AgentApplicationProfile
      >(
        `/admin/agent-applications/${profileId}/approve`,
      );

    return response.data;
  },


  async rejectAgent(
    profileId: string,
    reason: string,
  ): Promise<
    AgentApplicationProfile
  > {
    const response =
      await api.post<
        AgentApplicationProfile
      >(
        `/admin/agent-applications/${profileId}/reject`,
        {
          reason,
        },
      );

    return response.data;
  },


  async getAgentDocumentAccess(
    profileId: string,
    documentId: string,
    download = false,
  ): Promise<
    AgentDocumentAccessResponse
  > {
    const response =
      await api.get<
        AgentDocumentAccessResponse
      >(
        `/admin/agent-applications/${profileId}/documents/${documentId}/access`,
        {
          params: {
            download,
          },
        },
      );

    return response.data;
  },


  /* =======================================================
     REPORTS
  ======================================================= */

  async listReports(
    status?: ReportStatus,
  ): Promise<ListingReport[]> {
    const response =
      await api.get<
        ListingReport[]
      >(
        "/admin/reports",
        {
          params:
            status
              ? {
                  status,
                }
              : undefined,
        },
      );

    return response.data;
  },


  async resolveReport(
    reportId: string,
    status: ReportStatus,
    resolutionNote: string,
  ): Promise<ListingReport> {
    const response =
      await api.patch<
        ListingReport
      >(
        `/admin/reports/${reportId}`,
        {
          status,
          resolution_note:
            resolutionNote,
        },
      );

    return response.data;
  },


  /* =======================================================
     USERS
  ======================================================= */

  async listUsers(
    filters:
      AdminUserFilters = {},
  ): Promise<AdminUser[]> {
    const response =
      await api.get<
        AdminUser[]
      >(
        "/admin/users",
        {
          params:
            filters,
        },
      );

    return response.data;
  },


  async updateUserStatus(
    userId: string,
    status: AccountStatus,
    reason?: string,
  ): Promise<AdminUser> {
    const response =
      await api.patch<
        AdminUser
      >(
        `/admin/users/${userId}/status`,
        {
          status,
          reason:
            reason || null,
        },
      );

    return response.data;
  },


  async updateUserRole(
    userId: string,
    role: UserRole,
    reason?: string,
  ): Promise<AdminUser> {
    const response =
      await api.patch<
        AdminUser
      >(
        `/admin/users/${userId}/role`,
        {
          role,
          reason:
            reason || null,
        },
      );

    return response.data;
  },


  /* =======================================================
     AUDIT / SYSTEM
  ======================================================= */

  async listAuditLogs(
    filters:
      AuditLogFilters = {},
  ): Promise<AuditLog[]> {
    const response =
      await api.get<
        AuditLog[]
      >(
        "/admin/audit-logs",
        {
          params:
            filters,
        },
      );

    return response.data;
  },


  async getReadiness():
    Promise<SystemReadiness> {
    const response =
      await api.get<SystemReadiness>(
        "/health/ready",
      );

    return response.data;
  },


  async runMaintenance():
    Promise<MaintenanceResult> {
    const response =
      await api.post<MaintenanceResult>(
        "/admin/maintenance/run",
      );

    return response.data;
  },
};