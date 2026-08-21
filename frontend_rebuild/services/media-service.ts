import {
  api,
} from "@/lib/api";

import type {
  CloudinaryUploadResponse,
  MediaResourceType,
  MediaScope,
  MediaUploadSignature,
  UploadedMedia,
} from "@/types/media";


interface UploadOptions {
  file: File;

  resourceType:
    MediaResourceType;

  scope:
    MediaScope;

  onProgress?: (
    progress: number,
  ) => void;
}


/**
 * Upload the actual file
 * directly from the user's
 * browser to Cloudinary.
 *
 * The HomeLink backend is only
 * responsible for generating
 * the signed upload parameters.
 */
function uploadToCloudinary(
  signature:
    MediaUploadSignature,

  file: File,

  onProgress?: (
    progress: number,
  ) => void,
): Promise<CloudinaryUploadResponse> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const request =
        new XMLHttpRequest();

      const formData =
        new FormData();


      /*
       * These parameters must
       * match what the backend
       * included in the
       * Cloudinary signature.
       */
      formData.append(
        "file",
        file,
      );

      formData.append(
        "api_key",
        signature.api_key,
      );

      formData.append(
        "timestamp",
        String(
          signature.timestamp,
        ),
      );

      formData.append(
        "signature",
        signature.signature,
      );

      formData.append(
        "folder",
        signature.folder,
      );

      formData.append(
        "allowed_formats",
        signature.allowed_formats,
      );


      request.open(
        "POST",
        signature.upload_url,
      );


      /* ==============================
         UPLOAD PROGRESS
      ============================== */

      request.upload.addEventListener(
        "progress",
        (
          event,
        ) => {
          if (
            !event.lengthComputable
          ) {
            return;
          }


          const progress =
            Math.round(
              (
                event.loaded /
                event.total
              ) *
                100,
            );


          onProgress?.(
            progress,
          );
        },
      );


      /* ==============================
         CLOUDINARY RESPONSE
      ============================== */

      request.addEventListener(
        "load",
        () => {
          let response:
            | CloudinaryUploadResponse
            | {
                error?: {
                  message?: string;
                };
              };


          try {
            response =
              JSON.parse(
                request.responseText,
              ) as
                | CloudinaryUploadResponse
                | {
                    error?: {
                      message?: string;
                    };
                  };
          } catch {
            reject(
              new Error(
                "The media service returned an invalid response.",
              ),
            );

            return;
          }


          /*
           * Cloudinary may return
           * a useful error body
           * even when the HTTP
           * request itself failed.
           */
          if (
            request.status < 200 ||
            request.status >= 300
          ) {
            const message =
              "error" in response
                ? response.error
                    ?.message
                : undefined;


            reject(
              new Error(
                message ||
                  "Media upload failed.",
              ),
            );

            return;
          }


          const uploaded =
            response as
              CloudinaryUploadResponse;


          /*
           * These fields are
           * important to both
           * listing media and
           * agent-document
           * verification.
           */
          if (
            !uploaded.secure_url ||
            !uploaded.public_id ||
            !uploaded.resource_type ||
            !uploaded.format ||
            !uploaded.type
          ) {
            reject(
              new Error(
                "Cloudinary returned incomplete media information.",
              ),
            );

            return;
          }


          resolve(
            uploaded,
          );
        },
      );


      /* ==============================
         NETWORK ERROR
      ============================== */

      request.addEventListener(
        "error",
        () => {
          reject(
            new Error(
              "The media upload could not be completed.",
            ),
          );
        },
      );


      /* ==============================
         CANCELLED UPLOAD
      ============================== */

      request.addEventListener(
        "abort",
        () => {
          reject(
            new Error(
              "The media upload was cancelled.",
            ),
          );
        },
      );


      request.send(
        formData,
      );
    },
  );
}


/* =========================================================
   MEDIA SERVICE
========================================================= */

export const mediaService = {
  /**
   * Ask HomeLink's backend for
   * a short-lived authenticated
   * Cloudinary upload
   * signature.
   */
  async getUploadSignature(
    resourceType:
      MediaResourceType,

    scope:
      MediaScope,
  ): Promise<MediaUploadSignature> {
    const response =
      await api.post<MediaUploadSignature>(
        "/media/upload-signature",
        {
          resource_type:
            resourceType,

          scope,
        },
      );


    return response.data;
  },


  /**
   * Complete the two-stage
   * media upload:
   *
   * 1. HomeLink backend signs it.
   * 2. Browser uploads directly
   *    to Cloudinary.
   */
  async upload({
    file,
    resourceType,
    scope,
    onProgress,
  }: UploadOptions): Promise<UploadedMedia> {
    const signature =
      await this.getUploadSignature(
        resourceType,
        scope,
      );


    const uploaded =
      await uploadToCloudinary(
        signature,
        file,
        onProgress,
      );


    return {
      url:
        uploaded.secure_url,

      publicId:
        uploaded.public_id,

      resourceType:
        uploaded.resource_type,

      fileFormat:
        uploaded.format,

      deliveryType:
        uploaded.type,

      originalName:
        file.name,

      bytes:
        uploaded.bytes,
    };
  },
};