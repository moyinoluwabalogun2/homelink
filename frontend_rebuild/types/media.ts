export type MediaResourceType =
  | "image"
  | "video";


export type MediaScope =
  | "listings"
  | "agent-documents"
  | "profiles"
  | "advertisements";


export type MediaDeliveryType =
  | "upload"
  | "authenticated";


export interface MediaUploadSignature {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;

  /*
   * Short asset ID submitted to Cloudinary together
   * with the signed folder.
   */
  upload_public_id: string;

  /*
   * Complete folder/public-id expected in
   * Cloudinary's successful upload response.
   */
  expected_public_id: string;

  resource_type: MediaResourceType;
  delivery_type: MediaDeliveryType;

  allowed_formats: string;
  upload_url: string;

  /*
   * Present only for anonymous advertisement uploads.
   * It proves that HomeLink created and verified the
   * signed upload before an advert is submitted.
   */
  claim_token?: string | null;

  claim_token_expires_at?:
    | number
    | null;
}


export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;

  resource_type:
    MediaResourceType;

  format: string;
  type: MediaDeliveryType;

  bytes: number;

  width?: number;
  height?: number;
  duration?: number;
}


export interface UploadedMedia {
  url: string;
  publicId: string;
  resourceType: MediaResourceType;
  fileFormat: string;
  deliveryType: MediaDeliveryType;
  originalName: string;
  bytes: number;
}


export interface UploadedAdvertisementImage {
  url: string;
  publicId: string;
  claimToken: string;

  claimTokenExpiresAt:
    | number
    | null;

  fileFormat: string;
  deliveryType: MediaDeliveryType;
  originalName: string;
  bytes: number;

  width:
    | number
    | null;

  height:
    | number
    | null;
}


export interface MediaValue {
  url: string;
  publicId: string | null;
}