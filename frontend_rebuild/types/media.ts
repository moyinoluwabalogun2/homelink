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

  /**
   * Actual Cloudinary format,
   * e.g. jpg, png, webp,
   * mp4.
   */
  format: string;

  /**
   * Cloudinary delivery type.
   *
   * Normal media:
   *   upload
   *
   * Agent verification:
   *   authenticated
   */
  type: MediaDeliveryType;

  bytes: number;

  width?: number;

  height?: number;

  duration?: number;
}


/**
 * Returned after the browser has
 * completed the Cloudinary upload.
 */
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


/**
 * Media state used while a listing
 * form is being edited.
 */
export interface MediaValue {
  url: string;

  publicId:
    string | null;
}