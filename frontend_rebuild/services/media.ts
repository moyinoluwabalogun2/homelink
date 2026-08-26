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


/* =========================================================
   DIRECT CLOUDINARY UPLOAD
========================================================= */

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


      /* =====================================================
         FILE
      ===================================================== */

      formData.append(
        "file",
        file,
      );


      /* =====================================================
         AUTHENTICATION
      ===================================================== */

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


      /* =====================================================
         SIGNED UPLOAD PARAMETERS

         IMPORTANT:

         These are the SAME parameters that the HomeLink
         backend included when creating the Cloudinary
         signature.

         Do not remove one without also changing the backend.
      ===================================================== */

      formData.append(
        "folder",
        signature.folder,
      );

      formData.append(
        "allowed_formats",
        signature.allowed_formats,
      );

      formData.append(
        "type",
        signature.delivery_type,
      );


      /* =====================================================
         REQUEST
      ===================================================== */

      request.open(
        "POST",
        signature.upload_url,
      );


      /* =====================================================
         PROGRESS
      ===================================================== */

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


      /* =====================================================
         SUCCESS / CLOUDINARY ERROR
      ===================================================== */

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


          /* =================================================
             VERIFY DELIVERY TYPE

             For agent documents this MUST be authenticated.

             For normal media this MUST be upload.
          ================================================= */

          if (
            uploaded.type !==
            signature.delivery_type
          ) {
            reject(
              new Error(
                "Cloudinary stored the file with an unexpected access type.",
              ),
            );

            return;
          }


          resolve(
            uploaded,
          );
        },
      );


      /* =====================================================
         NETWORK ERROR
      ===================================================== */

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


      /* =====================================================
         CANCEL
      ===================================================== */

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

  async getUploadSignature(
    resourceType:
      MediaResourceType,

    scope:
      MediaScope,
  ): Promise<MediaUploadSignature> {

    const response =
      await api.post<
        MediaUploadSignature
      >(
        "/media/upload-signature",
        {
          resource_type:
            resourceType,

          scope,
        },
      );

    return response.data;
  },


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


    /*
     * Defensive check.
     *
     * Verification documents must NEVER accidentally be uploaded
     * using normal public Cloudinary delivery.
     */
    if (
      scope ===
        "agent-documents" &&
      signature.delivery_type !==
        "authenticated"
    ) {
      throw new Error(
        "HomeLink did not authorize a protected verification upload.",
      );
    }


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