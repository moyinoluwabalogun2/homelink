export type LegalDocumentType = "privacy" | "terms" | "cookie";

export interface LegalDocument {
  document_type: LegalDocumentType;
  version: string;
  effective_date: string;
  is_draft: boolean;
  contact_email: string;
  content_markdown: string;
}