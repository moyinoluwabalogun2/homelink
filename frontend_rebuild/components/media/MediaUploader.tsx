"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useRef,
  useState,
} from "react";

import Image from "next/image";
import axios from "axios";

import {
  FileVideo2,
  ImagePlus,
  Link2,
  Trash2,
  UploadCloud,
} from "lucide-react";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  mediaService,
} from "@/services/media-service";

import type {
  MediaResourceType,
  MediaScope,
  MediaValue,
} from "@/types/media";

import styles from "./MediaUploader.module.css";


interface MediaUploaderProps {
  label: string;
  helperText: string;

  value: MediaValue[];

  onChange: (
    items: MediaValue[],
  ) => void;

  resourceType:
    MediaResourceType;

  scope: MediaScope;

  accept: string;

  maxFiles: number;

  maxBytes: number;

  disabled?: boolean;
}


function isHttpUrl(
  value: string,
): boolean {
  try {
    const url =
      new URL(value);

    return (
      url.protocol ===
        "http:" ||
      url.protocol ===
        "https:"
    );
  } catch {
    return false;
  }
}


function formatMegabytes(
  bytes: number,
): string {
  return `${
    Math.round(
      bytes /
        1024 /
        1024,
    )
  } MB`;
}


export default function MediaUploader({
  label,
  helperText,
  value,
  onChange,
  resourceType,
  scope,
  accept,
  maxFiles,
  maxBytes,
  disabled = false,
}: MediaUploaderProps) {
  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );


  const [
    dragging,
    setDragging,
  ] =
    useState(false);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    progress,
    setProgress,
  ] =
    useState(0);

  const [
    manualUrl,
    setManualUrl,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    cloudinaryUnavailable,
    setCloudinaryUnavailable,
  ] =
    useState(false);


  const remainingSlots =
    Math.max(
      maxFiles -
        value.length,
      0,
    );


  const validateFiles = (
    files: File[],
  ): File[] => {
    if (
      files.length >
      remainingSlots
    ) {
      setError(
        `You can add ${remainingSlots} more ${
          remainingSlots === 1
            ? "file"
            : "files"
        }.`,
      );

      return [];
    }


    const oversized =
      files.find(
        (file) =>
          file.size >
          maxBytes,
      );

    if (oversized) {
      setError(
        `${oversized.name} is larger than ${formatMegabytes(
          maxBytes,
        )}.`,
      );

      return [];
    }


    const wrongType =
      files.find(
        (file) => {
          if (
            resourceType ===
            "image"
          ) {
            return !file.type.startsWith(
              "image/",
            );
          }

          return !file.type.startsWith(
            "video/",
          );
        },
      );


    if (wrongType) {
      setError(
        resourceType ===
          "image"
          ? "Only image files are allowed here."
          : "Only video files are allowed here.",
      );

      return [];
    }


    return files;
  };


  const uploadFiles =
    async (
      files: File[],
    ) => {
      const validFiles =
        validateFiles(
          files,
        );

      if (
        validFiles.length === 0
      ) {
        return;
      }


      setUploading(true);
      setError("");
      setCloudinaryUnavailable(
        false,
      );


      /*
       * Keep successful files even if a later
       * file in the same batch fails.
       */
      const nextValue: MediaValue[] =
        [...value];


      try {
        for (
          const file of
          validFiles
        ) {
          setProgress(0);

          const uploaded =
            await mediaService.upload({
              file,
              resourceType,
              scope,
              onProgress:
                setProgress,
            });


          nextValue.push({
            url: uploaded.url,

            publicId:
              uploaded.publicId,
          });


          /*
           * Update after every successful upload.
           * This prevents a successful first file
           * becoming invisible if file #2 fails.
           */
          onChange([
            ...nextValue,
          ]);
        }
      } catch (reason) {
        if (
          axios.isAxiosError(
            reason,
          ) &&
          reason.response
            ?.status === 503
        ) {
          setCloudinaryUnavailable(
            true,
          );
        }


        setError(
          getApiErrorMessage(
            reason,
            "The media upload could not be completed.",
          ),
        );
      } finally {
        setProgress(0);

        setUploading(
          false,
        );


        if (
          inputRef.current
        ) {
          inputRef.current.value =
            "";
        }
      }
    };


  const handleInput = (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    void uploadFiles(
      Array.from(
        event.target.files ??
          [],
      ),
    );
  };


  const handleDrop = (
    event:
      DragEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();

    setDragging(false);


    if (
      disabled ||
      uploading ||
      remainingSlots === 0
    ) {
      return;
    }


    void uploadFiles(
      Array.from(
        event.dataTransfer
          .files,
      ),
    );
  };


  const addManualUrl =
    () => {
      if (
        disabled ||
        uploading
      ) {
        return;
      }


      const normalized =
        manualUrl.trim();


      if (
        !isHttpUrl(
          normalized,
        )
      ) {
        setError(
          "Enter a complete URL beginning with http:// or https://.",
        );

        return;
      }


      if (
        value.some(
          (item) =>
            item.url ===
            normalized,
        )
      ) {
        setError(
          "That media URL is already in the list.",
        );

        return;
      }


      if (
        remainingSlots === 0
      ) {
        setError(
          `The maximum of ${maxFiles} files has been reached.`,
        );

        return;
      }


      onChange([
        ...value,
        {
          url: normalized,
          publicId: null,
        },
      ]);

      setManualUrl("");

      setError("");
    };


  const removeItem = (
    url: string,
  ) => {
    if (
      disabled ||
      uploading
    ) {
      return;
    }

    onChange(
      value.filter(
        (item) =>
          item.url !== url,
      ),
    );
  };


  const inputId =
    `${scope}-${resourceType}-upload`;


  return (
    <div
      className={
        styles.field
      }
    >
      <div
        className={
          styles.heading
        }
      >
        <div>
          <strong>
            {label}
          </strong>

          <span>
            {helperText}
          </span>
        </div>


        <span
          className={
            styles.count
          }
        >
          {value.length}/
          {maxFiles}
        </span>
      </div>


      <input
        ref={inputRef}
        id={inputId}
        className={
          styles.hiddenInput
        }
        type="file"
        accept={accept}
        multiple={
          maxFiles > 1
        }
        disabled={
          disabled ||
          uploading ||
          remainingSlots ===
            0
        }
        onChange={
          handleInput
        }
      />


      <button
        type="button"
        className={`${styles.dropzone} ${
          dragging
            ? styles.dragging
            : ""
        }`}
        disabled={
          disabled ||
          uploading ||
          remainingSlots ===
            0
        }
        onClick={() =>
          inputRef.current?.click()
        }
        onDragEnter={(
          event,
        ) => {
          event.preventDefault();

          setDragging(
            true,
          );
        }}
        onDragOver={(
          event,
        ) =>
          event.preventDefault()
        }
        onDragLeave={() =>
          setDragging(
            false,
          )
        }
        onDrop={
          handleDrop
        }
      >
        {resourceType ===
        "image" ? (
          <ImagePlus
            aria-hidden="true"
          />
        ) : (
          <UploadCloud
            aria-hidden="true"
          />
        )}


        <strong>
          {remainingSlots === 0
            ? "Maximum files added"
            : uploading
              ? "Uploading securely…"
              : "Choose files or drag them here"}
        </strong>


        <span>
          Maximum{" "}
          {formatMegabytes(
            maxBytes,
          )}{" "}
          per file ·{" "}
          {remainingSlots}{" "}
          slot
          {remainingSlots === 1
            ? ""
            : "s"}{" "}
          remaining
        </span>
      </button>


      {uploading ? (
        <div
          className={
            styles.progress
          }
          aria-live="polite"
        >
          <div
            className={
              styles.progressHeader
            }
          >
            <span>
              Uploading media
            </span>

            <strong>
              {progress}%
            </strong>
          </div>


          <div
            className={
              styles.progressTrack
            }
          >
            <span
              style={{
                width:
                  `${progress}%`,
              }}
            />
          </div>
        </div>
      ) : null}


      {cloudinaryUnavailable ? (
        <p
          className={
            styles.notice
          }
        >
          Direct file uploads
          are not configured
          yet. You can still
          use a public media URL
          while testing.
        </p>
      ) : null}


      {error ? (
        <p
          className={
            styles.error
          }
        >
          {error}
        </p>
      ) : null}


      {value.length > 0 ? (
        <div
          className={
            styles.mediaGrid
          }
        >
          {value.map(
            (item) => (
              <article
                key={
                  item.url
                }
                className={
                  styles.mediaItem
                }
              >
                {resourceType ===
                "image" ? (
                  <Image
                    className={
                      styles.preview
                    }
                    src={
                      item.url
                    }
                    alt="Uploaded listing media"
                    width={420}
                    height={280}
                    sizes="(max-width: 560px) 45vw, 160px"
                    unoptimized
                  />
                ) : (
                  <div
                    className={
                      styles.videoPreview
                    }
                  >
                    <FileVideo2
                      aria-hidden="true"
                    />

                    <span>
                      {
                        item.url
                      }
                    </span>
                  </div>
                )}


                <button
                  type="button"
                  className={
                    styles.removeButton
                  }
                  onClick={() =>
                    removeItem(
                      item.url,
                    )
                  }
                  disabled={
                    disabled ||
                    uploading
                  }
                  aria-label="Remove media"
                >
                  <Trash2
                    aria-hidden="true"
                  />
                </button>
              </article>
            ),
          )}
        </div>
      ) : null}


      <div
        className={
          styles.manual
        }
      >
        <input
          type="url"
          value={
            manualUrl
          }
          onChange={(
            event,
          ) =>
            setManualUrl(
              event.target
                .value,
            )
          }
          placeholder={
            resourceType ===
            "image"
              ? "Paste a public image URL"
              : "Paste a public video URL"
          }
          disabled={
            disabled ||
            uploading ||
            remainingSlots ===
              0
          }
          onKeyDown={(
            event,
          ) => {
            if (
              event.key ===
              "Enter"
            ) {
              event.preventDefault();

              addManualUrl();
            }
          }}
        />


        <button
          type="button"
          disabled={
            !manualUrl.trim() ||
            disabled ||
            uploading ||
            remainingSlots ===
              0
          }
          onClick={
            addManualUrl
          }
        >
          <Link2
            aria-hidden="true"
          />

          Add URL
        </button>
      </div>
    </div>
  );
}