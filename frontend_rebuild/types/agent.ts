import type {
  PublicUser,
} from "@/types/listing";

import type {
  AreaRead,
} from "@/types/location";


export type AgentType =
  | "agent"
  | "landlord";


export type AgentApplicationStatus =
  | "pending"
  | "approved"
  | "rejected";


export type VerificationDocumentStatus =
  | "pending"
  | "approved"
  | "rejected";


export type VerificationDocumentType =
  | "national_id"
  | "cac"
  | "proof_of_address"
  | "property_ownership"
  | "other";


export interface AgentCoverageArea {
  area: AreaRead;
}


/* =========================================================
   PUBLIC AGENT PROFILE

   This matches the safe public backend response.
   No verification-document data appears here.
========================================================= */

export interface AgentProfile {
  id: string;

  user:
    PublicUser;

  agent_type:
    AgentType;

  business_name:
    string | null;

  bio:
    string;

  years_experience:
    number;

  status:
    AgentApplicationStatus;

  approved_at:
    string | null;

  coverage_areas:
    AgentCoverageArea[];
}


/* =========================================================
   PRIVATE VERIFICATION DOCUMENT
========================================================= */

export interface AgentDocument {
  id: string;

  document_type:
    VerificationDocumentType;

  file_url:
    string | null;

  status:
    VerificationDocumentStatus;

  rejection_reason:
    string | null;

  created_at:
    string;

  reviewed_at:
    string | null;

  purged_at:
    string | null;
}


/* =========================================================
   CURRENT USER'S PRIVATE APPLICATION
========================================================= */

export interface AgentApplicationProfile
  extends AgentProfile {
  rejection_reason:
    string | null;

  submitted_at:
    string;

  documents:
    AgentDocument[];
}


/* =========================================================
   PAYLOADS
========================================================= */

export interface AgentApplyPayload {
  agent_type:
    AgentType;

  business_name?:
    string | null;

  bio:
    string;

  years_experience:
    number;

  area_ids:
    string[];
}


export interface AgentDocumentPayload {
  document_type:
    VerificationDocumentType;

  file_url:
    string;

  storage_public_id:
    string;

  file_format:
    string | null;

  storage_resource_type:
    string;

  storage_delivery_type:
    string;
}