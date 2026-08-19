import axios from "axios";

import {
  api,
} from "@/lib/api";

import type {
  AgentApplicationProfile,
  AgentApplyPayload,
  AgentDocumentPayload,
  AgentProfile,
} from "@/types/agent";


export const agentService = {
  /* =======================================================
     PUBLIC AGENTS
  ======================================================= */

  async listApproved():
    Promise<AgentProfile[]> {
    const response =
      await api.get<
        AgentProfile[]
      >(
        "/agents",
      );

    return response.data;
  },


  async getById(
    profileId: string,
  ): Promise<AgentProfile> {
    const response =
      await api.get<
        AgentProfile
      >(
        `/agents/${profileId}`,
      );

    return response.data;
  },


  /* =======================================================
     CURRENT USER APPLICATION
  ======================================================= */

  async getMine():
    Promise<
      AgentApplicationProfile
      | null
    > {
    try {
      const response =
        await api.get<
          AgentApplicationProfile
        >(
          "/agents/me",
        );

      return response.data;

    } catch (
      error
    ) {
      if (
        axios.isAxiosError(
          error,
        )
        && error.response
          ?.status === 404
      ) {
        return null;
      }

      throw error;
    }
  },


  async apply(
    payload:
      AgentApplyPayload,
  ): Promise<
    AgentApplicationProfile
  > {
    const response =
      await api.post<
        AgentApplicationProfile
      >(
        "/agents/apply",
        payload,
      );

    return response.data;
  },


  async addDocument(
    payload:
      AgentDocumentPayload,
  ): Promise<
    AgentApplicationProfile
  > {
    const response =
      await api.post<
        AgentApplicationProfile
      >(
        "/agents/me/documents",
        payload,
      );

    return response.data;
  },
};