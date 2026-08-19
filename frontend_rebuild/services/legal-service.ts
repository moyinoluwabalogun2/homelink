import { api } from "@/lib/api";
import type { LegalDocument, LegalDocumentType } from "@/types/legal";

const endpointByType: Record<LegalDocumentType, string> = {
  privacy: "/legal/privacy",
  terms: "/legal/terms",
  cookie: "/legal/cookie-notice",
};

export const legalService = {
  async getDocument(type: LegalDocumentType): Promise<LegalDocument> {
    const response = await api.get<LegalDocument>(endpointByType[type]);
    return response.data;
  },
};