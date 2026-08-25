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
   CLOUDINARY DIRECT UPLOAD
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
         SIGNED PARAMETERS

         These must match the parameters signed by HomeLink's
         backend.
      ===================================================== */

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


      /*
       * CRITICAL:
       *
       * Listings and profile media:
       *
       *   type = upload
       *
       * Agent verification documents:
       *
       *   type = authenticated
       *
       * This value is included in the server-generated
       * Cloudinary signature and MUST therefore be sent
       * unchanged with the upload.
       */
      formData.append(
        "type",
        signature.delivery_type,
      );


      request.open(
        "POST",
        signature.upload_url,
      );


      /* =====================================================
         UPLOAD PROGRESS
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
         CLOUDINARY RESPONSE
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


          /*
           * Do not silently accept Cloudinary storing the asset
           * with a delivery type different from the one HomeLink
           * requested.
           */
          if (
            uploaded.type !==
            signature.delivery_type
          ) {
            reject(
              new Error(
                "Cloudinary stored the media with an unexpected access type.",
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
         NETWORK FAILURE
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
         CANCELLED UPLOAD
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