export type MediaResourceType = "image" | "video";

export type MediaScope =
  | "listings"
  | "agent-documents"
  | "profiles";

export interface MediaUploadSignature {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
  resource_type: MediaResourceType;
  upload_url: string;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  resource_type: MediaResourceType;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface UploadedMedia {
  url: string;
  publicId: string;
  resourceType: MediaResourceType;
  originalName: string;
  bytes: number;
}