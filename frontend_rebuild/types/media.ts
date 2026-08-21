export type MediaResourceType =
  | "image"
  | "video";

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

  resource_type:
    MediaResourceType;

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
   * e.g. jpg, png, webp, pdf,
   * mp4.
   */
  format: string;

  /**
   * Cloudinary delivery type.
   * Normal uploaded assets
   * normally use "upload".
   */
  type: string;

  bytes: number;

  width?: number;

  height?: number;

  duration?: number;
}


/**
 * Returned after HomeLink has
 * uploaded a file directly from
 * the browser to Cloudinary.
 *
 * These values can then be
 * supplied to listing or agent
 * document APIs.
 */
export interface UploadedMedia {
  url: string;

  publicId: string;

  resourceType:
    MediaResourceType;

  fileFormat: string;

  deliveryType: string;

  originalName: string;

  bytes: number;
}


/**
 * Media state used while a
 * listing form is being edited.
 *
 * publicId is populated for
 * files uploaded to HomeLink's
 * Cloudinary account.
 *
 * It is null for manually
 * supplied external URLs.
 */
export interface MediaValue {
  url: string;

  publicId: string | null;
}