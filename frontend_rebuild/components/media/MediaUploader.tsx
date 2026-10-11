"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useId,
  useRef,
  useState,
} from "react";

import Image from "next/image";

import axios from "axios";

import {
  ArrowLeft,
  ArrowRight,
  FileVideo2,
  ImagePlus,
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

import styles
  from "./MediaUploader.module.css";


interface MediaUploaderProps {
  label: string;
  helperText: string;
  value: MediaValue[];

  onChange: (
    items: MediaValue[],
  ) => void;

  resourceType: MediaResourceType;
  scope: MediaScope;
  accept: string;
  maxFiles: number;
  maxBytes: number;
  disabled?: boolean;
}


function formatMegabytes(
  bytes: number,
): string {
  const megabytes =
    bytes / 1024 / 1024;

  return `${
    Number.isInteger(
      megabytes,
    )
      ? megabytes
      : megabytes.toFixed(1)
  } MB`;
}


function formatFileCount(
  count: number,
): string {
  return `${count} ${
    count === 1
      ? "file"
      : "files"
  }`;
}


function acceptedMimePatterns(
  accept: string,
): string[] {
  return accept
    .split(",")
    .map(
      (item) =>
        item
          .trim()
          .toLowerCase(),
    )
    .filter(
      (item) =>
        item.startsWith(
          "image/",
        )
        || item.startsWith(
          "video/",
        ),
    );
}


function fileMatchesAccept(
  file: File,
  accept: string,
  resourceType: MediaResourceType,
): boolean {
  const mimeType =
    file.type
      .trim()
      .toLowerCase();

  if (!mimeType) {
    return false;
  }

  const correctResourceType =
    resourceType === "image"
      ? mimeType.startsWith(
          "image/",
        )
      : mimeType.startsWith(
          "video/",
        );

  if (!correctResourceType) {
    return false;
  }

  const patterns =
    acceptedMimePatterns(
      accept,
    );

  if (patterns.length === 0) {
    return true;
  }

  return patterns.some(
    (pattern) => {
      if (
        pattern.endsWith(
          "/*",
        )
      ) {
        return mimeType.startsWith(
          pattern.slice(
            0,
            -1,
          ),
        );
      }

      return (
        mimeType === pattern
      );
    },
  );
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
  const generatedId =
    useId();

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  /*
   * React state is asynchronous. This ref prevents two rapid
   * clicks or drops from starting overlapping upload batches.
   */
  const uploadLockRef =
    useRef(false);

  /*
   * Drag events fire when moving across children inside the
   * dropzone. A depth counter prevents visible flickering.
   */
  const dragDepthRef =
    useRef(0);

  const [
    dragging,
    setDragging,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    currentFile,
    setCurrentFile,
  ] = useState("");

  const [
    currentFileNumber,
    setCurrentFileNumber,
  ] = useState(0);

  const [
    uploadTotal,
    setUploadTotal,
  ] = useState(0);

  const [
    error,
    setError,
  ] = useState("");

  const [
    cloudinaryUnavailable,
    setCloudinaryUnavailable,
  ] = useState(false);

  const inputId = (
    `${scope}-` +
    `${resourceType}-` +
    generatedId.replace(
      /:/g,
      "",
    )
  );

  const helperId =
    `${inputId}-helper`;

  const errorId =
    `${inputId}-error`;

  const remainingSlots =
    Math.max(
      maxFiles - value.length,
      0,
    );

  const uploadDisabled =
    disabled
    || uploading
    || remainingSlots === 0;


  const resetFileInput =
    () => {
      if (inputRef.current) {
        inputRef.current.value =
          "";
      }
    };


  const validateFiles = (
    files: File[],
  ): File[] => {
    setError("");

    if (files.length === 0) {
      return [];
    }

    if (remainingSlots === 0) {
      setError(
        `The maximum of ${maxFiles} ${
          resourceType === "image"
            ? "images"
            : "videos"
        } has been reached.`,
      );

      return [];
    }

    if (
      files.length >
      remainingSlots
    ) {
      setError(
        `You selected ${
          formatFileCount(
            files.length,
          )
        }, but only ${
          remainingSlots
        } ${
          remainingSlots === 1
            ? "slot is"
            : "slots are"
        } available.`,
      );

      return [];
    }

    const emptyFile =
      files.find(
        (file) =>
          file.size === 0,
      );

    if (emptyFile) {
      setError(
        `${emptyFile.name} is empty and cannot be uploaded.`,
      );

      return [];
    }

    const oversizedFile =
      files.find(
        (file) =>
          file.size >
          maxBytes,
      );

    if (oversizedFile) {
      setError(
        `${oversizedFile.name} is larger than the ${
          formatMegabytes(
            maxBytes,
          )
        } limit.`,
      );

      return [];
    }

    const wrongType =
      files.find(
        (file) =>
          !fileMatchesAccept(
            file,
            accept,
            resourceType,
          ),
      );

    if (wrongType) {
      setError(
        resourceType === "image"
          ? `${wrongType.name} is not a supported image file.`
          : `${wrongType.name} is not a supported video file.`,
      );

      return [];
    }

    const seenFiles =
      new Set<string>();

    const duplicateFile =
      files.find(
        (file) => {
          const signature = [
            file.name,
            file.size,
            file.lastModified,
            file.type,
          ].join(":");

          if (
            seenFiles.has(
              signature,
            )
          ) {
            return true;
          }

          seenFiles.add(
            signature,
          );

          return false;
        },
      );

    if (duplicateFile) {
      setError(
        `${duplicateFile.name} was selected more than once.`,
      );

      return [];
    }

    return files;
  };


  const uploadFiles =
    async (
      files: File[],
    ): Promise<void> => {
      if (
        uploadLockRef.current
        || disabled
      ) {
        return;
      }

      const validFiles =
        validateFiles(
          files,
        );

      if (
        validFiles.length === 0
      ) {
        resetFileInput();

        return;
      }

      uploadLockRef.current =
        true;

      setUploading(true);
      setProgress(0);

      setUploadTotal(
        validFiles.length,
      );

      setCurrentFileNumber(
        0,
      );

      setCloudinaryUnavailable(
        false,
      );

      /*
       * Completed files remain available if a later file in
       * the same batch fails. Unclaimed Cloudinary assets are
       * handled by the backend cleanup queue.
       */
      const nextValue:
        MediaValue[] = [
        ...value,
      ];

      try {
        for (
          let index = 0;
          index <
          validFiles.length;
          index += 1
        ) {
          const file =
            validFiles[index];

          setCurrentFile(
            file.name,
          );

          setCurrentFileNumber(
            index + 1,
          );

          setProgress(0);

          const uploaded =
            await mediaService.upload({
              file,
              resourceType,
              scope,
              onProgress: (
                nextProgress,
              ) => {
                setProgress(
                  Math.min(
                    100,
                    Math.max(
                      0,
                      nextProgress,
                    ),
                  ),
                );
              },
            });

          const alreadyIncluded =
            nextValue.some(
              (item) =>
                item.url ===
                  uploaded.url
                || (
                  item.publicId !==
                    null
                  && item.publicId ===
                    uploaded.publicId
                ),
            );

          if (
            !alreadyIncluded
          ) {
            nextValue.push({
              url:
                uploaded.url,

              publicId:
                uploaded.publicId,
            });

            onChange([
              ...nextValue,
            ]);
          }
        }

        setError("");
      } catch (reason) {
        if (
          axios.isAxiosError(
            reason,
          )
          && reason.response
            ?.status === 503
        ) {
          setCloudinaryUnavailable(
            true,
          );
        }

        setError(
          getApiErrorMessage(
            reason,
            "The media upload could not be completed. Any files that finished uploading have been kept.",
          ),
        );
      } finally {
        uploadLockRef.current =
          false;

        setUploading(false);
        setProgress(0);
        setCurrentFile("");
        setCurrentFileNumber(0);
        setUploadTotal(0);

        resetFileInput();
      }
    };


  const handleInput = (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    void uploadFiles(
      Array.from(
        event.target.files
        ?? [],
      ),
    );
  };


  const handleDrop = (
    event:
      DragEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();

    dragDepthRef.current = 0;
    setDragging(false);

    if (
      uploadDisabled
      || uploadLockRef.current
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


  const removeItem = (
    index: number,
  ) => {
    if (
      disabled
      || uploading
      || uploadLockRef.current
    ) {
      return;
    }

    onChange(
      value.filter(
        (
          _,
          itemIndex,
        ) =>
          itemIndex !== index,
      ),
    );

    setError("");
  };


  const moveItem = (
    index: number,
    direction: -1 | 1,
  ) => {
    if (
      disabled
      || uploading
      || uploadLockRef.current
    ) {
      return;
    }

    const nextIndex =
      index + direction;

    if (
      nextIndex < 0
      || nextIndex >=
        value.length
    ) {
      return;
    }

    const reordered = [
      ...value,
    ];

    const current =
      reordered[index];

    reordered[index] =
      reordered[nextIndex];

    reordered[nextIndex] =
      current;

    onChange(
      reordered,
    );

    setError("");
  };


  const dropzoneText =
    remainingSlots === 0
      ? "Maximum files added"
      : uploading
        ? "Uploading securely…"
        : resourceType === "image"
          ? "Choose images or drag them here"
          : "Choose a video or drag it here";


  return (
    <section
      className={styles.field}
      aria-labelledby={
        `${inputId}-label`
      }
      aria-busy={uploading}
    >
      <div
        className={styles.heading}
      >
        <div>
          <strong
            id={`${inputId}-label`}
          >
            {label}
          </strong>

          <span id={helperId}>
            {helperText}
          </span>
        </div>

        <span
          className={styles.count}
          aria-label={
            `${value.length} of ${maxFiles} files added`
          }
        >
          {value.length}/{maxFiles}
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
          uploadDisabled
        }
        aria-describedby={
          error
            ? `${helperId} ${errorId}`
            : helperId
        }
        onChange={
          handleInput
        }
      />

      <button
        type="button"
        className={[
          styles.dropzone,

          dragging
            ? styles.dragging
            : "",

          uploading
            ? styles.uploading
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={
          uploadDisabled
        }
        aria-describedby={
          helperId
        }
        onClick={() =>
          inputRef.current
            ?.click()
        }
        onDragEnter={(
          event,
        ) => {
          event.preventDefault();

          if (
            uploadDisabled
            || uploadLockRef
              .current
          ) {
            return;
          }

          dragDepthRef.current +=
            1;

          setDragging(true);
        }}
        onDragOver={(
          event,
        ) => {
          event.preventDefault();

          if (
            event.dataTransfer
          ) {
            event.dataTransfer
              .dropEffect =
              uploadDisabled
                ? "none"
                : "copy";
          }
        }}
        onDragLeave={(
          event,
        ) => {
          event.preventDefault();

          dragDepthRef.current =
            Math.max(
              0,
              dragDepthRef.current
                - 1,
            );

          if (
            dragDepthRef.current
            === 0
          ) {
            setDragging(false);
          }
        }}
        onDrop={
          handleDrop
        }
      >
        <span
          className={
            styles.dropIcon
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
        </span>

        <strong>
          {dropzoneText}
        </strong>

        <span>
          Maximum{" "}
          {formatMegabytes(
            maxBytes,
          )}{" "}
          per file
          {" · "}
          {remainingSlots}{" "}
          {remainingSlots === 1
            ? "slot"
            : "slots"}{" "}
          remaining
        </span>
      </button>

      {uploading ? (
        <div
          className={
            styles.progress
          }
          role="status"
          aria-live="polite"
        >
          <div
            className={
              styles.progressHeader
            }
          >
            <div>
              <span>
                Uploading file{" "}
                {currentFileNumber}{" "}
                of {uploadTotal}
              </span>

              <strong
                title={
                  currentFile
                }
              >
                {currentFile}
              </strong>
            </div>

            <b>
              {progress}%
            </b>
          </div>

          <div
            className={
              styles.progressTrack
            }
            role="progressbar"
            aria-label={
              `Uploading ${currentFile}`
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              progress
            }
          >
            <span
              style={{
                width:
                  `${progress}%`,
              }}
            />
          </div>

          <p>
            Keep this page open
            until the current upload
            finishes.
          </p>
        </div>
      ) : null}

      {cloudinaryUnavailable ? (
        <p
          className={
            styles.notice
          }
          role="status"
        >
          Direct uploads are
          temporarily unavailable.
          Please retry shortly.
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          className={
            styles.error
          }
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {value.length > 0 ? (
        <div
          className={
            styles.mediaGrid
          }
          aria-label={
            `${label} currently added`
          }
          role="list"
        >
          {value.map(
            (
              item,
              index,
            ) => (
              <article
                key={
                  item.publicId
                  ?? item.url
                }
                className={
                  styles.mediaItem
                }
                role="listitem"
              >
                <div
                  className={
                    styles.previewFrame
                  }
                >
                  {resourceType ===
                  "image" ? (
                    <Image
                      className={
                        styles.preview
                      }
                      src={item.url}
                      alt={
                        index === 0
                          ? "Listing cover image"
                          : `Listing image ${index + 1}`
                      }
                      width={420}
                      height={280}
                      sizes="(max-width: 360px) 100vw, (max-width: 680px) 46vw, 180px"
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

                      <span
                        title={
                          item.url
                        }
                      >
                        Video{" "}
                        {index + 1}
                      </span>
                    </div>
                  )}

                  {resourceType ===
                    "image"
                  && index === 0 ? (
                    <span
                      className={
                        styles.coverBadge
                      }
                    >
                      Cover
                    </span>
                  ) : (
                    <span
                      className={
                        styles.orderBadge
                      }
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                <div
                  className={
                    styles.mediaActions
                  }
                  aria-label={
                    `Actions for media ${index + 1}`
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      moveItem(
                        index,
                        -1,
                      )
                    }
                    disabled={
                      disabled
                      || uploading
                      || index === 0
                    }
                    aria-label={
                      `Move media ${index + 1} earlier`
                    }
                    title="Move earlier"
                  >
                    <ArrowLeft
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      moveItem(
                        index,
                        1,
                      )
                    }
                    disabled={
                      disabled
                      || uploading
                      || index ===
                        value.length
                        - 1
                    }
                    aria-label={
                      `Move media ${index + 1} later`
                    }
                    title="Move later"
                  >
                    <ArrowRight
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    type="button"
                    className={
                      styles.removeButton
                    }
                    onClick={() =>
                      removeItem(
                        index,
                      )
                    }
                    disabled={
                      disabled
                      || uploading
                    }
                    aria-label={
                      `Remove media ${index + 1}`
                    }
                    title="Remove media"
                  >
                    <Trash2
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}