import {
  api,
} from "@/lib/api";

import type {
  CloudinaryUploadResponse,
  MediaResourceType,
  MediaScope,
  MediaUploadSignature,
  UploadedAdvertisementImage,
  UploadedMedia,
} from "@/types/media";


const MAX_ADVERTISEMENT_IMAGE_BYTES =
  5 * 1024 * 1024;


const ADVERTISEMENT_IMAGE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


interface UploadOptions {
  file: File;
  resourceType: MediaResourceType;
  scope: MediaScope;

  onProgress?: (
    progress: number,
  ) => void;
}


interface AdvertisementUploadOptions {
  file: File;

  onProgress?: (
    progress: number,
  ) => void;
}


function uploadToCloudinary(
  signature: MediaUploadSignature,
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
        "public_id",
        signature.upload_public_id,
      );

      formData.append(
        "allowed_formats",
        signature.allowed_formats,
      );

      formData.append(
        "type",
        signature.delivery_type,
      );

      request.open(
        "POST",
        signature.upload_url,
      );

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
            response = JSON.parse(
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

          if (
            uploaded.resource_type !==
            signature.resource_type
          ) {
            reject(
              new Error(
                "Cloudinary returned an unexpected media type.",
              ),
            );

            return;
          }

          if (
            uploaded.public_id !==
            signature.expected_public_id
          ) {
            reject(
              new Error(
                "Cloudinary returned an unexpected media identifier.",
              ),
            );

            return;
          }

          resolve(
            uploaded,
          );
        },
      );

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


function validateAdvertisementImage(
  file: File,
): void {
  if (
    !ADVERTISEMENT_IMAGE_TYPES.has(
      file.type,
    )
  ) {
    throw new Error(
      "Use a JPG, PNG or WebP image for your advertisement.",
    );
  }

  if (
    file.size <= 0
  ) {
    throw new Error(
      "The selected advertisement image is empty.",
    );
  }

  if (
    file.size >
    MAX_ADVERTISEMENT_IMAGE_BYTES
  ) {
    throw new Error(
      "Advertisement images must not exceed 5 MB.",
    );
  }
}


export const mediaService = {
  async getUploadSignature(
    resourceType: MediaResourceType,
    scope: MediaScope,
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


  async getAdvertisementUploadSignature():
    Promise<MediaUploadSignature> {
    const response =
      await api.post<MediaUploadSignature>(
        "/media/advertisement-upload-signature",
        {},
      );

    const signature =
      response.data;

    if (
      signature.resource_type !==
      "image"
    ) {
      throw new Error(
        "HomeLink returned an invalid advertisement media type.",
      );
    }

    if (
      !signature.claim_token
    ) {
      throw new Error(
        "HomeLink did not return the private advertisement upload claim.",
      );
    }

    return signature;
  },


  async uploadAdvertisementImage({
    file,
    onProgress,
  }: AdvertisementUploadOptions):
    Promise<UploadedAdvertisementImage> {
    validateAdvertisementImage(
      file,
    );

    const signature =
      await this
        .getAdvertisementUploadSignature();

    const uploaded =
      await uploadToCloudinary(
        signature,
        file,
        onProgress,
      );

    if (
      !signature.claim_token
    ) {
      throw new Error(
        "The advertisement upload claim is unavailable.",
      );
    }

    return {
      url:
        uploaded.secure_url,

      publicId:
        uploaded.public_id,

      claimToken:
        signature.claim_token,

      claimTokenExpiresAt:
        signature
          .claim_token_expires_at ??
        null,

      fileFormat:
        uploaded.format,

      deliveryType:
        uploaded.type,

      originalName:
        file.name,

      bytes:
        uploaded.bytes,

      width:
        uploaded.width ??
        null,

      height:
        uploaded.height ??
        null,
    };
  },
};