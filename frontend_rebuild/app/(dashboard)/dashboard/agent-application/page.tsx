"use client";

import {
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
  RotateCcw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { toast } from "sonner";

import StatusBadge from "@/components/dashboard/StatusBadge";
import shared from "@/components/dashboard/DashboardPage.module.css";

import { getApiErrorMessage } from "@/lib/api-errors";
import { titleCase } from "@/lib/formatters";

import { agentService } from "@/services/agent-service";
import { locationService } from "@/services/location-service";
import { mediaService } from "@/services/media-service";

import type {
  AgentApplicationProfile,
  AgentApplyPayload,
  AgentType,
  VerificationDocumentType,
} from "@/types/agent";

import type { AreaRead } from "@/types/location";

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


export default function AgentApplicationPage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

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


  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    Promise.all([
      agentService.getMine(),
      locationService.listAreas(),
    ])
      .then(
        ([
          mine,
          areaItems,
        ]) => {
          setProfile(
            mine,
          );

          setAreas(
            areaItems,
          );

          if (mine) {
            setAgentType(
              mine.agent_type,
            );

            setBusinessName(
              mine.business_name ?? "",
            );

            setBio(
              mine.bio,
            );

            setYears(
              String(
                mine.years_experience,
              ),
            );

            setAreaIds(
              mine.coverage_areas.map(
                (coverage) =>
                  coverage.area.id,
              ),
            );
          }
        },
      )
      .catch(
        (reason) => {
          toast.error(
            getApiErrorMessage(
              reason,
            ),
          );
        },
      )
      .finally(
        () => {
          setLoading(
            false,
          );
        },
      );
  }, []);


  /* =========================================================
     DOCUMENT COUNTS
  ========================================================= */

  const currentDocuments =
    useMemo(
      () =>
        profile?.documents.filter(
          (document) =>
            document.purged_at === null,
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
            document.status === "pending",
        ),
      [
        currentDocuments,
      ],
    );


  /* =========================================================
     APPLICATION
  ========================================================= */

  const toggleArea = (
    areaId: string,
  ) => {
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
      const numericYears =
        Number(
          years,
        );

      if (
        !Number.isFinite(
          numericYears,
        ) ||
        numericYears < 0 ||
        numericYears > 80
      ) {
        toast.error(
          "Enter a valid number of years of experience.",
        );

        return;
      }

      const payload:
        AgentApplyPayload = {
          agent_type:
            agentType,

          business_name:
            businessName.trim() ||
            null,

          bio:
            bio.trim(),

          years_experience:
            numericYears,

          area_ids:
            areaIds,
        };

      if (
        payload.bio.length < 40
      ) {
        toast.error(
          "Your professional bio must be at least 40 characters.",
        );

        return;
      }

      if (
        payload.area_ids.length ===
        0
      ) {
        toast.error(
          "Choose at least one coverage area.",
        );

        return;
      }

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

        toast.success(
          resubmission
            ? "Application resubmitted. Add a current verification document."
            : "Application submitted. Add a verification document next.",
        );
      } catch (
        reason
      ) {
        toast.error(
          getApiErrorMessage(
            reason,
          ),
        );
      } finally {
        setApplicationBusy(
          false,
        );
      }
    };


  /* =========================================================
     FILE SELECTION
  ========================================================= */

  const selectDocument = (
    file: File | null,
  ) => {
    if (!file) {
      setSelectedFile(
        null,
      );

      return;
    }

    if (
      !ACCEPTED_DOCUMENT_TYPES.has(
        file.type,
      )
    ) {
      toast.error(
        "Use a JPG, PNG or WebP image.",
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    if (
      file.size >
      MAX_DOCUMENT_BYTES
    ) {
      toast.error(
        "Verification images must be 10 MB or smaller.",
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    setSelectedFile(
      file,
    );

    setUploadProgress(
      0,
    );
  };


  /* =========================================================
     PROTECTED DOCUMENT UPLOAD
  ========================================================= */

  const uploadDocument =
    async () => {
      if (
        !profile ||
        profile.status !==
          "pending" ||
        !selectedFile ||
        uploading
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
                    progress,
                  );
                },
            },
          );

        const updated =
          await agentService.addDocument(
            {
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
            },
          );

        setProfile(
          updated,
        );

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

        toast.success(
          "Verification document uploaded securely.",
        );
      } catch (
        reason
      ) {
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


  /* =========================================================
     APPLICATION FORM
  ========================================================= */

  const renderApplicationForm = (
    isResubmission: boolean,
  ) => {
    return (
      <section
        className={
          styles.applicationCard
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
            <h2>
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
              <option
                value="agent"
              >
                Agent
              </option>

              <option
                value="landlord"
              >
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
              value={
                businessName
              }
              maxLength={
                180
              }
              disabled={
                applicationBusy
              }
              onChange={
                (event) => {
                  setBusinessName(
                    event.target
                      .value,
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
              value={
                years
              }
              disabled={
                applicationBusy
              }
              onChange={
                (event) => {
                  setYears(
                    event.target
                      .value,
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
            maxLength={
              3000
            }
            disabled={
              applicationBusy
            }
            onChange={
              (event) => {
                setBio(
                  event.target
                    .value,
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
                      areaIds.includes(
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
        </fieldset>


        <button
          type="button"
          className={
            styles.submitButton
          }
          disabled={
            applicationBusy
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
  };


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div
        className={
          shared.loadingGrid
        }
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
            />
          ),
        )}
      </div>
    );
  }


  /* =========================================================
     PAGE
  ========================================================= */

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
            Agent or landlord profile.
          </h1>

          <p>
            Verify your identity before
            publishing rental or
            property-for-sale listings.
          </p>
        </div>
      </header>


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
            >
              <span>
                <FileCheck2
                  aria-hidden="true"
                />
              </span>

              <div>
                <strong>
                  Application under review
                </strong>

                <p>
                  Add at least one
                  current verification
                  document. HomeLink admins
                  will review the protected
                  file before approving your
                  profile.
                </p>
              </div>
            </div>
          ) : null}


          {profile.status ===
          "approved" ? (
            <div
              className={`${styles.statusNotice} ${styles.approvedNotice}`}
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
                  profile has been approved.
                  Verification files are
                  retained only for the
                  configured retention
                  period.
                </p>
              </div>
            </div>
          ) : null}


          {profile.status ===
          "rejected" ? (
            <div
              className={`${styles.statusNotice} ${styles.rejectedNotice}`}
            >
              <span>
                <AlertTriangle
                  aria-hidden="true"
                />
              </span>

              <div>
                <strong>
                  Application needs attention
                </strong>

                <p>
                  {profile.rejection_reason ||
                    "Review your details and submit the application again."}
                </p>
              </div>
            </div>
          ) : null}


          <section
            className={
              styles.detailsGrid
            }
          >
            <article>
              <span>
                Experience
              </span>

              <strong>
                {
                  profile.years_experience
                }{" "}
                {profile.years_experience ===
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
                  profile.coverage_areas
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
                  currentDocuments.length
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
                  <h2>
                    Verification documents
                  </h2>

                  <p>
                    Upload a clear photo.
                    Verification files are
                    stored as protected assets
                    and are never exposed on
                    your public agent profile.
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
                    <option
                      value="national_id"
                    >
                      National ID
                    </option>

                    <option
                      value="cac"
                    >
                      CAC document
                    </option>

                    <option
                      value="proof_of_address"
                    >
                      Proof of address
                    </option>

                    <option
                      value="property_ownership"
                    >
                      Property ownership
                    </option>

                    <option
                      value="other"
                    >
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
                            .files?.[0] ??
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
                      JPG, PNG or WebP ·
                      maximum 10 MB
                    </span>
                  </div>
                </label>
              </div>


              {uploading ? (
                <div
                  className={
                    styles.progressArea
                  }
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
                      No current verification
                      file yet
                    </strong>

                    <p>
                      Upload at least one
                      document before an admin
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

                  <h2>
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
                        styles.documentRow
                      }
                    >
                      <span
                        className={
                          styles.documentRowIcon
                        }
                      >
                        <FileImage
                          aria-hidden="true"
                        />
                      </span>

                      <div
                        className={
                          styles.documentInfo
                        }
                      >
                        <strong>
                          {documentLabel(
                            document.document_type,
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

                        {document.rejection_reason ? (
                          <small>
                            {
                              document.rejection_reason
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