"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FileImage,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { toast } from "sonner";

import StatusBadge from "@/components/dashboard/StatusBadge";
import shared from "@/components/dashboard/DashboardPage.module.css";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  titleCase,
} from "@/lib/formatters";

import {
  agentService,
} from "@/services/agent-service";

import {
  locationService,
} from "@/services/location-service";

import {
  mediaService,
} from "@/services/media-service";

import type {
  AgentApplicationProfile,
  AgentApplyPayload,
  AgentType,
  VerificationDocumentType,
} from "@/types/agent";

import type {
  AreaRead,
} from "@/types/location";

import styles from "./page.module.css";


const MAX_DOCUMENT_BYTES =
  10 * 1024 * 1024;

const ACCEPTED_DOCUMENT_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


function documentLabel(
  type: VerificationDocumentType,
): string {
  switch (type) {
    case "national_id":
      return "National ID";

    case "cac":
      return "CAC document";

    case "proof_of_address":
      return "Proof of address";

    case "property_ownership":
      return "Property ownership";

    default:
      return "Other document";
  }
}


function clampProgress(
  value: number,
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(value),
    ),
  );
}


export default function AgentApplicationPage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const requestVersionRef =
    useRef(0);

  const [
    profile,
    setProfile,
  ] =
    useState<AgentApplicationProfile | null>(
      null,
    );

  const [
    areas,
    setAreas,
  ] =
    useState<AreaRead[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState("");

  const [
    applicationBusy,
    setApplicationBusy,
  ] =
    useState(false);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    uploadProgress,
    setUploadProgress,
  ] =
    useState(0);

  const [
    agentType,
    setAgentType,
  ] =
    useState<AgentType>(
      "agent",
    );

  const [
    businessName,
    setBusinessName,
  ] =
    useState("");

  const [
    bio,
    setBio,
  ] =
    useState("");

  const [
    years,
    setYears,
  ] =
    useState("0");

  const [
    areaIds,
    setAreaIds,
  ] =
    useState<string[]>(
      [],
    );

  const [
    documentType,
    setDocumentType,
  ] =
    useState<VerificationDocumentType>(
      "national_id",
    );

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null,
    );


  const populateApplication =
    useCallback(
      (
        application:
          AgentApplicationProfile,
      ) => {
        setAgentType(
          application.agent_type,
        );

        setBusinessName(
          application.business_name ??
            "",
        );

        setBio(
          application.bio,
        );

        setYears(
          String(
            application
              .years_experience,
          ),
        );

        setAreaIds(
          application
            .coverage_areas
            .map(
              (coverage) =>
                coverage.area.id,
            ),
        );
      },
      [],
    );


  const loadPage =
    useCallback(
      async () => {
        const requestVersion =
          ++requestVersionRef.current;

        setLoading(true);
        setLoadError("");

        const [
          profileResult,
          areaResult,
        ] =
          await Promise.allSettled([
            agentService.getMine(),
            locationService.listAreas(),
          ]);

        if (
          requestVersion !==
          requestVersionRef.current
        ) {
          return;
        }

        if (
          profileResult.status ===
          "fulfilled"
        ) {
          setProfile(
            profileResult.value,
          );

          if (
            profileResult.value
          ) {
            populateApplication(
              profileResult.value,
            );
          }
        }

        if (
          areaResult.status ===
          "fulfilled"
        ) {
          setAreas(
            areaResult.value,
          );
        }

        const failures = [
          profileResult,
          areaResult,
        ].filter(
          (result) =>
            result.status ===
            "rejected",
        );

        if (
          failures.length > 0
        ) {
          const firstFailure =
            failures[
              0
            ] as PromiseRejectedResult;

          setLoadError(
            getApiErrorMessage(
              firstFailure.reason,
              "Your application information could not be fully loaded.",
            ),
          );
        }

        setLoading(false);
      },
      [
        populateApplication,
      ],
    );


  useEffect(() => {
    void loadPage();

    return () => {
      requestVersionRef.current +=
        1;
    };
  }, [
    loadPage,
  ]);


  const currentDocuments =
    useMemo(
      () =>
        profile?.documents.filter(
          (document) =>
            document.purged_at ===
            null,
        ) ?? [],
      [
        profile,
      ],
    );


  const pendingDocuments =
    useMemo(
      () =>
        currentDocuments.filter(
          (document) =>
            document.status ===
            "pending",
        ),
      [
        currentDocuments,
      ],
    );


  const selectedAreas =
    useMemo(
      () =>
        new Set(
          areaIds,
        ),
      [
        areaIds,
      ],
    );


  const toggleArea = (
    areaId: string,
  ) => {
    if (
      applicationBusy
    ) {
      return;
    }

    setAreaIds(
      (current) =>
        current.includes(
          areaId,
        )
          ? current.filter(
              (id) =>
                id !== areaId,
            )
          : [
              ...current,
              areaId,
            ],
    );
  };


  const submitApplication =
    async (
      resubmission: boolean,
    ) => {
      if (
        applicationBusy ||
        uploading
      ) {
        return;
      }

      const numericYears =
        Number(years);

      if (
        !Number.isInteger(
          numericYears,
        ) ||
        numericYears < 0 ||
        numericYears > 80
      ) {
        toast.error(
          "Enter a whole number between 0 and 80 for years of experience.",
        );

        return;
      }

      const normalizedBio =
        bio.trim();

      const normalizedBusinessName =
        businessName.trim();

      if (
        normalizedBio.length <
        40
      ) {
        toast.error(
          "Your professional bio must be at least 40 characters.",
        );

        return;
      }

      if (
        areaIds.length === 0
      ) {
        toast.error(
          "Choose at least one coverage area.",
        );

        return;
      }

      const payload:
        AgentApplyPayload = {
          agent_type:
            agentType,

          business_name:
            normalizedBusinessName ||
            null,

          bio:
            normalizedBio,

          years_experience:
            numericYears,

          area_ids:
            Array.from(
              new Set(
                areaIds,
              ),
            ),
        };

      setApplicationBusy(
        true,
      );

      try {
        const updated =
          await agentService.apply(
            payload,
          );

        setProfile(
          updated,
        );

        populateApplication(
          updated,
        );

        toast.success(
          resubmission
            ? "Application resubmitted. Add a current verification document."
            : "Application submitted. Add a verification document next.",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Your application could not be submitted.",
          ),
        );
      } finally {
        setApplicationBusy(
          false,
        );
      }
    };


  const clearSelectedFile =
    () => {
      setSelectedFile(
        null,
      );

      setUploadProgress(
        0,
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    };


  const selectDocument = (
    file: File | null,
  ) => {
    if (!file) {
      clearSelectedFile();
      return;
    }

    if (
      !ACCEPTED_DOCUMENT_TYPES.has(
        file.type,
      )
    ) {
      clearSelectedFile();

      toast.error(
        "Use a JPG, PNG or WebP image.",
      );

      return;
    }

    if (
      file.size >
      MAX_DOCUMENT_BYTES
    ) {
      clearSelectedFile();

      toast.error(
        "Verification images must be 10 MB or smaller.",
      );

      return;
    }

    setSelectedFile(
      file,
    );

    setUploadProgress(
      0,
    );
  };


  const uploadDocument =
    async () => {
      if (
        !profile ||
        profile.status !==
          "pending" ||
        !selectedFile ||
        uploading ||
        applicationBusy
      ) {
        return;
      }

      setUploading(
        true,
      );

      setUploadProgress(
        0,
      );

      try {
        const uploaded =
          await mediaService.upload(
            {
              file:
                selectedFile,

              resourceType:
                "image",

              scope:
                "agent-documents",

              onProgress:
                (progress) => {
                  setUploadProgress(
                    clampProgress(
                      progress,
                    ),
                  );
                },
            },
          );

        const updated =
          await agentService
            .addDocument({
              document_type:
                documentType,

              file_url:
                uploaded.url,

              storage_public_id:
                uploaded.publicId,

              file_format:
                uploaded.fileFormat,

              storage_resource_type:
                uploaded.resourceType,

              storage_delivery_type:
                uploaded.deliveryType,
            });

        setProfile(
          updated,
        );

        clearSelectedFile();

        toast.success(
          "Verification document uploaded securely.",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Verification document could not be uploaded.",
          ),
        );
      } finally {
        setUploading(
          false,
        );
      }
    };


  const renderApplicationForm = (
    isResubmission: boolean,
  ) => (
    <section
      className={
        styles.applicationCard
      }
      aria-labelledby={
        isResubmission
          ? "resubmit-title"
          : "application-title"
      }
    >
      <div
        className={
          styles.sectionHeading
        }
      >
        <span>
          {isResubmission ? (
            <RotateCcw
              aria-hidden="true"
            />
          ) : (
            <ShieldCheck
              aria-hidden="true"
            />
          )}
        </span>

        <div>
          <h2
            id={
              isResubmission
                ? "resubmit-title"
                : "application-title"
            }
          >
            {isResubmission
              ? "Update and resubmit"
              : "Apply for verification"}
          </h2>

          <p>
            {isResubmission
              ? "Correct your application details, resubmit, then upload a current verification document."
              : "Tell HomeLink about your work before uploading your verification document."}
          </p>
        </div>
      </div>

      <div
        className={
          styles.formGrid
        }
      >
        <label>
          <span>
            Application type
          </span>

          <select
            value={
              agentType
            }
            disabled={
              applicationBusy
            }
            onChange={
              (event) => {
                setAgentType(
                  event.target
                    .value as AgentType,
                );
              }
            }
          >
            <option value="agent">
              Agent
            </option>

            <option value="landlord">
              Landlord
            </option>
          </select>
        </label>

        <label>
          <span>
            Business name

            <small>
              Optional
            </small>
          </span>

          <input
            type="text"
            value={
              businessName
            }
            maxLength={
              180
            }
            autoComplete="organization"
            disabled={
              applicationBusy
            }
            placeholder="Business or agency name"
            onChange={
              (event) => {
                setBusinessName(
                  event.target.value,
                );
              }
            }
          />
        </label>

        <label>
          <span>
            Years of experience
          </span>

          <input
            type="number"
            min="0"
            max="80"
            step="1"
            inputMode="numeric"
            value={
              years
            }
            disabled={
              applicationBusy
            }
            onChange={
              (event) => {
                setYears(
                  event.target.value,
                );
              }
            }
          />
        </label>
      </div>

      <label
        className={
          styles.bio
        }
      >
        <span>
          Professional bio
        </span>

        <textarea
          rows={
            6
          }
          value={
            bio
          }
          minLength={
            40
          }
          maxLength={
            3000
          }
          disabled={
            applicationBusy
          }
          onChange={
            (event) => {
              setBio(
                event.target.value,
              );
            }
          }
          placeholder="Describe your experience, the properties you manage and how you support clients."
        />

        <small>
          {bio.length}
          /3000 · minimum 40
          characters
        </small>
      </label>

      <fieldset
        disabled={
          applicationBusy
        }
      >
        <legend>
          Coverage areas
        </legend>

        <p
          className={
            styles.fieldHint
          }
        >
          Choose the areas where
          you actively work.
        </p>

        {areas.length > 0 ? (
          <div
            className={
              styles.areaGrid
            }
          >
            {areas.map(
              (area) => (
                <label
                  key={
                    area.id
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedAreas.has(
                        area.id,
                      )
                    }
                    onChange={
                      () => {
                        toggleArea(
                          area.id,
                        );
                      }
                    }
                  />

                  <span>
                    {area.name}
                  </span>
                </label>
              ),
            )}
          </div>
        ) : (
          <p
            className={
              styles.fieldHint
            }
          >
            Coverage areas are
            temporarily unavailable.
            Try loading the page
            again.
          </p>
        )}
      </fieldset>

      <button
        type="button"
        className={
          styles.submitButton
        }
        disabled={
          applicationBusy ||
          uploading ||
          areas.length === 0
        }
        onClick={
          () => {
            void submitApplication(
              isResubmission,
            );
          }
        }
      >
        {applicationBusy ? (
          <Loader2
            className={
              styles.spinner
            }
            aria-hidden="true"
          />
        ) : isResubmission ? (
          <RotateCcw
            aria-hidden="true"
          />
        ) : (
          <ShieldCheck
            aria-hidden="true"
          />
        )}

        {applicationBusy
          ? "Submitting…"
          : isResubmission
            ? "Resubmit application"
            : "Submit application"}
      </button>
    </section>
  );


  if (
    loading &&
    !profile
  ) {
    return (
      <div
        className={
          shared.loadingGrid
        }
        aria-label="Loading agent application"
        aria-live="polite"
        aria-busy="true"
      >
        {Array.from(
          {
            length: 3,
          },
          (
            _,
            index,
          ) => (
            <div
              key={
                index
              }
              className={
                shared.skeleton
              }
              aria-hidden="true"
            />
          ),
        )}
      </div>
    );
  }


  return (
    <div
      className={
        shared.page
      }
    >
      <header
        className={
          shared.pageHeader
        }
      >
        <div>
          <span
            className={
              shared.eyebrow
            }
          >
            <FileCheck2
              aria-hidden="true"
            />

            Trust and verification
          </span>

          <h1>
            Agent or landlord
            profile.
          </h1>

          <p>
            Verify your identity
            before publishing rental
            or property-for-sale
            listings.
          </p>
        </div>
      </header>

      {loadError ? (
        <div
          className={
            styles.loadError
          }
          role="alert"
        >
          <div>
            <strong>
              Application information
              could not be fully loaded.
            </strong>

            <span>
              {loadError}
            </span>
          </div>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              () => {
                void loadPage();
              }
            }
          >
            <RefreshCw
              className={
                loading
                  ? styles.spinner
                  : undefined
              }
              aria-hidden="true"
            />

            {loading
              ? "Trying again…"
              : "Try again"}
          </button>
        </div>
      ) : null}

      {!profile ? (
        renderApplicationForm(
          false,
        )
      ) : (
        <>
          <section
            className={
              styles.profileSummary
            }
          >
            <span
              className={
                styles.icon
              }
            >
              <ShieldCheck
                aria-hidden="true"
              />
            </span>

            <div
              className={
                styles.summaryCopy
              }
            >
              <span>
                {titleCase(
                  profile.agent_type,
                )}
              </span>

              <h2>
                {profile.business_name ||
                  profile.user.full_name}
              </h2>

              <p>
                {profile.bio}
              </p>
            </div>

            <StatusBadge
              status={
                profile.status
              }
            />
          </section>

          {profile.status ===
          "pending" ? (
            <div
              className={
                styles.statusNotice
              }
              role="status"
            >
              <span>
                <FileCheck2
                  aria-hidden="true"
                />
              </span>

              <div>
                <strong>
                  Application under
                  review
                </strong>

                <p>
                  Add at least one
                  current verification
                  document. HomeLink
                  admins will review the
                  protected file before
                  approving your profile.
                </p>
              </div>
            </div>
          ) : null}

          {profile.status ===
          "approved" ? (
            <div
              className={`${styles.statusNotice} ${styles.approvedNotice}`}
              role="status"
            >
              <span>
                <CheckCircle2
                  aria-hidden="true"
                />
              </span>

              <div>
                <strong>
                  Verification approved
                </strong>

                <p>
                  Your agent or landlord
                  profile has been
                  approved. Verification
                  files are retained only
                  for the configured
                  retention period.
                </p>
              </div>
            </div>
          ) : null}

          {profile.status ===
          "rejected" ? (
            <div
              className={`${styles.statusNotice} ${styles.rejectedNotice}`}
              role="alert"
            >
              <span>
                <AlertTriangle
                  aria-hidden="true"
                />
              </span>

              <div>
                <strong>
                  Application needs
                  attention
                </strong>

                <p>
                  {profile
                    .rejection_reason ||
                    "Review your details and submit the application again."}
                </p>
              </div>
            </div>
          ) : null}

          <section
            className={
              styles.detailsGrid
            }
            aria-label="Application summary"
          >
            <article>
              <span>
                Experience
              </span>

              <strong>
                {
                  profile
                    .years_experience
                }{" "}
                {profile
                  .years_experience ===
                1
                  ? "year"
                  : "years"}
              </strong>
            </article>

            <article>
              <span>
                Coverage areas
              </span>

              <strong>
                {
                  profile
                    .coverage_areas
                    .length
                }
              </strong>
            </article>

            <article>
              <span>
                Current files
              </span>

              <strong>
                {
                  currentDocuments
                    .length
                }
              </strong>
            </article>
          </section>

          {profile.status ===
          "rejected"
            ? renderApplicationForm(
                true,
              )
            : null}

          {profile.status ===
          "pending" ? (
            <section
              className={
                styles.documentPanel
              }
              aria-labelledby="documents-title"
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <span>
                  <UploadCloud
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <h2
                    id="documents-title"
                  >
                    Verification
                    documents
                  </h2>

                  <p>
                    Upload a clear
                    photo. Verification
                    files are stored as
                    protected assets and
                    are never exposed on
                    your public profile.
                  </p>
                </div>
              </div>

              <div
                className={
                  styles.documentControls
                }
              >
                <label
                  className={
                    styles.documentType
                  }
                >
                  <span>
                    Document type
                  </span>

                  <select
                    value={
                      documentType
                    }
                    disabled={
                      uploading
                    }
                    onChange={
                      (event) => {
                        setDocumentType(
                          event.target
                            .value as VerificationDocumentType,
                        );
                      }
                    }
                  >
                    <option value="national_id">
                      National ID
                    </option>

                    <option value="cac">
                      CAC document
                    </option>

                    <option value="proof_of_address">
                      Proof of address
                    </option>

                    <option value="property_ownership">
                      Property ownership
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>
                </label>

                <label
                  className={
                    styles.uploadBox
                  }
                >
                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={
                      uploading
                    }
                    onChange={
                      (event) => {
                        selectDocument(
                          event.target
                            .files?.[
                              0
                            ] ??
                            null,
                        );
                      }
                    }
                  />

                  <span
                    className={
                      styles.uploadIcon
                    }
                  >
                    <FileImage
                      aria-hidden="true"
                    />
                  </span>

                  <div>
                    <strong>
                      {selectedFile
                        ? selectedFile.name
                        : "Choose verification photo"}
                    </strong>

                    <span>
                      JPG, PNG or WebP
                      · maximum 10 MB
                    </span>
                  </div>
                </label>
              </div>

              {uploading ? (
                <div
                  className={
                    styles.progressArea
                  }
                  role="status"
                  aria-live="polite"
                >
                  <div>
                    <span>
                      Uploading securely
                    </span>

                    <strong>
                      {uploadProgress}%
                    </strong>
                  </div>

                  <progress
                    max={
                      100
                    }
                    value={
                      uploadProgress
                    }
                  />
                </div>
              ) : null}

              <button
                type="button"
                className={
                  styles.uploadButton
                }
                disabled={
                  uploading ||
                  applicationBusy ||
                  !selectedFile
                }
                onClick={
                  () => {
                    void uploadDocument();
                  }
                }
              >
                {uploading ? (
                  <Loader2
                    className={
                      styles.spinner
                    }
                    aria-hidden="true"
                  />
                ) : (
                  <UploadCloud
                    aria-hidden="true"
                  />
                )}

                {uploading
                  ? "Uploading…"
                  : "Upload document"}
              </button>

              {pendingDocuments.length ===
              0 ? (
                <div
                  className={
                    styles.documentEmpty
                  }
                >
                  <FileImage
                    aria-hidden="true"
                  />

                  <div>
                    <strong>
                      No current
                      verification file
                      yet
                    </strong>

                    <p>
                      Upload at least
                      one document
                      before an admin
                      can approve the
                      application.
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {profile.documents.length >
          0 ? (
            <section
              className={
                styles.documentHistory
              }
              aria-labelledby="document-history-title"
            >
              <div
                className={
                  styles.historyHeader
                }
              >
                <div>
                  <span>
                    Verification history
                  </span>

                  <h2
                    id="document-history-title"
                  >
                    Submitted documents
                  </h2>
                </div>

                <strong>
                  {
                    profile.documents
                      .length
                  }
                </strong>
              </div>

              <div
                className={
                  styles.documentList
                }
              >
                {profile.documents.map(
                  (document) => (
                    <div
                      key={
                        document.id
                      }
                      className={
                        styles
                          .documentRow
                      }
                    >
                      <span
                        className={
                          styles
                            .documentRowIcon
                        }
                      >
                        <FileImage
                          aria-hidden="true"
                        />
                      </span>

                      <div
                        className={
                          styles
                            .documentInfo
                        }
                      >
                        <strong>
                          {documentLabel(
                            document
                              .document_type,
                          )}
                        </strong>

                        <span>
                          {document.purged_at
                            ? "File removed after retention period"
                            : document.status ===
                                "pending"
                              ? "Protected file awaiting review"
                              : "Review completed"}
                        </span>

                        {document
                          .rejection_reason ? (
                          <small>
                            {
                              document
                                .rejection_reason
                            }
                          </small>
                        ) : null}
                      </div>

                      <StatusBadge
                        status={
                          document.status
                        }
                      />
                    </div>
                  ),
                )}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}