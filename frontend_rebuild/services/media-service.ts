import { api } from "@/lib/api";

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
         SIGNED CLOUDINARY PARAMETERS
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

      formData.append(
        "folder",
        signature.folder,
      );


      /*
       * IMPORTANT:
       *
       * The backend includes:
       *
       *     type=authenticated
       *
       * in the signature ONLY for agent verification
       * documents.
       *
       * Therefore the browser must send exactly the same
       * signed parameter.
       *
       * Normal listing/profile uploads remain unchanged.
       */
      if (
        signature.delivery_type ===
        "authenticated"
      ) {
        formData.append(
          "type",
          "authenticated",
        );
      }


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
              ) * 100,
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
              );
          } catch {
            reject(
              new Error(
                "Cloudinary returned an invalid response.",
              ),
            );

            return;
          }


          if (
            request.status <
              200 ||
            request.status >=
              300
          ) {
            const message =
              "error" in
              response
                ? response.error
                    ?.message
                : (
                    "Media upload failed."
                  );

            reject(
              new Error(
                message ??
                  "Media upload failed.",
              ),
            );

            return;
          }


          resolve(
            response as
              CloudinaryUploadResponse,
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
              "The media upload could not reach Cloudinary.",
            ),
          );
        },
      );


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

      /*
       * Use the backend-issued delivery type rather than
       * trusting anything coming from browser state.
       */
      deliveryType:
        signature.delivery_type,

      fileFormat:
        uploaded.format ??
        null,

      originalName:
        file.name,

      bytes:
        uploaded.bytes,

      width:
        uploaded.width,

      height:
        uploaded.height,

      duration:
        uploaded.duration,
    };
  },
};