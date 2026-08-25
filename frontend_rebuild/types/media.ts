export type MediaResourceType =
  | "image"
  | "video";


export type MediaScope =
  | "listings"
  | "agent-documents"
  | "profiles";


export type MediaDeliveryType =
  | "upload"
  | "authenticated";


export interface MediaUploadSignature {
  cloud_name: string;

  api_key: string;

  timestamp: number;

  signature: string;

  folder: string;

  resource_type:
    MediaResourceType;

  delivery_type:
    MediaDeliveryType;

  allowed_formats: string;

  upload_url: string;
}


export interface CloudinaryUploadResponse {
  secure_url: string;

  public_id: string;

  resource_type:
    MediaResourceType;

  format: string;

  type:
    MediaDeliveryType;

  bytes: number;

  width?: number;

  height?: number;

  duration?: number;
}


export interface UploadedMedia {
  url: string;

  publicId: string;

  resourceType:
    MediaResourceType;

  fileFormat: string;

  deliveryType:
    MediaDeliveryType;

  originalName: string;

  bytes: number;
}


export interface MediaValue {
  url: string;

  publicId:
    string | null;
}