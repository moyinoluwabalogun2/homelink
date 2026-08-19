"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Check,
  Download,
  Eye,
  FileCheck2,
  FileImage,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import {
  toast,
} from "sonner";

import DecisionDialog from "@/components/admin/DecisionDialog";

import adminTable from "@/components/admin/AdminTable.module.css";

import shared from "@/components/dashboard/DashboardPage.module.css";

import StatusBadge from "@/components/dashboard/StatusBadge";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatDate,
  titleCase,
} from "@/lib/formatters";

import {
  adminService,
} from "@/services/admin-service";

import type {
  AgentApplicationProfile,
  AgentApplicationStatus,
  AgentDocument,
} from "@/types/agent";

import styles from "./page.module.css";


const statusTabs:
  AgentApplicationStatus[] = [
    "pending",
    "approved",
    "rejected",
  ];


function documentLabel(
  document:
    AgentDocument,
): string {
  switch (
    document.document_type
  ) {
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


export default function AdminAgentsPage() {
  const [
    status,
    setStatus,
  ] =
    useState<AgentApplicationStatus>(
      "pending",
    );


  const [
    items,
    setItems,
  ] =
    useState<
      AgentApplicationProfile[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    workingId,
    setWorkingId,
  ] =
    useState<string | null>(
      null,
    );


  const [
    documentWorkingId,
    setDocumentWorkingId,
  ] =
    useState<string | null>(
      null,
    );


  const [
    rejectTarget,
    setRejectTarget,
  ] =
    useState<
      AgentApplicationProfile
      | null
    >(
      null,
    );


  const [
    error,
    setError,
  ] =
    useState("");


  /* =========================================================
     LOAD
  ========================================================= */

  const load =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError(
          "",
        );

        try {
          const applications =
            await adminService.listAgentApplications(
              status,
            );

          setItems(
            applications,
          );
        } catch (
          reason
        ) {
          setError(
            getApiErrorMessage(
              reason,
              "Agent applications could not be loaded.",
            ),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        status,
      ],
    );


  useEffect(() => {
    void load();
  }, [
    load,
  ]);


  /* =========================================================
     DOCUMENT ACCESS
  ========================================================= */

  const openDocument =
    async (
      profile:
        AgentApplicationProfile,

      document:
        AgentDocument,

      download:
        boolean,
    ) => {
      if (
        document.purged_at
        || documentWorkingId
      ) {
        return;
      }


      /*
       * Open a blank tab immediately so browser popup blockers
       * do not reject the window after the async API call.
       */
      const newWindow =
        window.open(
          "about:blank",
          "_blank",
        );


      if (!newWindow) {
        toast.error(
          "Your browser blocked the document window. Allow pop-ups for HomeLink and try again.",
        );

        return;
      }


      newWindow.opener =
        null;


      setDocumentWorkingId(
        document.id,
      );


      try {
        const access =
          await adminService.getAgentDocumentAccess(
            profile.id,
            document.id,
            download,
          );


        newWindow.location.href =
          access.url;

      } catch (
        reason
      ) {
        newWindow.close();

        toast.error(
          getApiErrorMessage(
            reason,
            download
              ? "The verification document could not be downloaded."
              : "The verification document could not be previewed.",
          ),
        );

      } finally {
        setDocumentWorkingId(
          null,
        );
      }
    };


  /* =========================================================
     APPROVE
  ========================================================= */

  const approve =
    async (
      profile:
        AgentApplicationProfile,
    ) => {
      setWorkingId(
        profile.id,
      );

      try {
        const updated =
          await adminService.approveAgent(
            profile.id,
          );


        if (
          status ===
          "pending"
        ) {
          setItems(
            (
              current,
            ) =>
              current.filter(
                (
                  item,
                ) =>
                  item.id !==
                  profile.id,
              ),
          );
        } else {
          setItems(
            (
              current,
            ) =>
              current.map(
                (
                  item,
                ) =>
                  item.id ===
                  updated.id
                    ? updated
                    : item,
              ),
          );
        }


        toast.success(
          "Agent or landlord application approved.",
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
        setWorkingId(
          null,
        );
      }
    };


  /* =========================================================
     REJECT
  ========================================================= */

  const reject =
    async (
      reason: string,
    ) => {
      if (
        !rejectTarget
      ) {
        return;
      }


      setWorkingId(
        rejectTarget.id,
      );


      try {
        await adminService.rejectAgent(
          rejectTarget.id,
          reason,
        );


        setItems(
          (
            current,
          ) =>
            current.filter(
              (
                item,
              ) =>
                item.id !==
                rejectTarget.id,
            ),
        );


        toast.success(
          "Application rejected with a verification note.",
        );


        setRejectTarget(
          null,
        );

      } catch (
        failure
      ) {
        toast.error(
          getApiErrorMessage(
            failure,
          ),
        );

      } finally {
        setWorkingId(
          null,
        );
      }
    };


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
            Agent applications.
          </h1>

          <p>
            Review identity,
            professional details,
            coverage areas and
            protected verification
            documents before granting
            property-posting access.
          </p>
        </div>


        <button
          type="button"
          className={
            shared.secondaryButton
          }
          onClick={
            () => {
              void load();
            }
          }
          disabled={
            loading
          }
        >
          <RefreshCw
            aria-hidden="true"
          />

          Refresh
        </button>
      </header>


      <div
        className={
          shared.tabs
        }
        role="tablist"
        aria-label="Application status"
      >
        {statusTabs.map(
          (
            item,
          ) => (
            <button
              key={
                item
              }
              type="button"
              className={
                status ===
                item
                  ? shared.activeTab
                  : ""
              }
              onClick={
                () => {
                  setStatus(
                    item,
                  );
                }
              }
            >
              {titleCase(
                item,
              )}
            </button>
          ),
        )}
      </div>


      {error ? (
        <div
          className={
            shared.error
          }
        >
          {error}
        </div>
      ) : null}


      {loading ? (
        <div
          className={
            adminTable.cardList
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
                  adminTable.skeleton
                }
              />
            ),
          )}
        </div>
      ) : null}


      {!loading &&
      items.length ===
        0 ? (
        <div
          className={
            shared.empty
          }
        >
          <span
            className={
              shared.emptyIcon
            }
          >
            <FileCheck2
              aria-hidden="true"
            />
          </span>

          <h2>
            No {status} applications
          </h2>

          <p>
            Applications matching
            this status will appear
            here.
          </p>
        </div>
      ) : null}


      {!loading &&
      items.length >
        0 ? (
        <div
          className={
            adminTable.cardList
          }
        >
          {items.map(
            (
              profile,
            ) => {
              const reviewableDocuments =
                profile.documents.filter(
                  (
                    document,
                  ) =>
                    document.status ===
                      "pending"
                    && document.purged_at ===
                      null,
                );


              const canApprove =
                reviewableDocuments.length >
                0;


              return (
                <article
                  key={
                    profile.id
                  }
                  className={
                    adminTable.dataCard
                  }
                >
                  <div
                    className={
                      adminTable.cardHeader
                    }
                  >
                    <div>
                      <strong>
                        {profile.business_name ||
                          profile.user.full_name}
                      </strong>

                      <span>
                        {titleCase(
                          profile.agent_type,
                        )}
                        {" · "}
                        {
                          profile.years_experience
                        }{" "}
                        years experience
                      </span>
                    </div>

                    <StatusBadge
                      status={
                        profile.status
                      }
                    />
                  </div>


                  <p
                    className={
                      styles.bio
                    }
                  >
                    {profile.bio}
                  </p>


                  <div
                    className={
                      adminTable.cardMeta
                    }
                  >
                    <div>
                      <span>
                        Applicant
                      </span>

                      <strong>
                        {
                          profile.user
                            .full_name
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Coverage
                      </span>

                      <strong>
                        {
                          profile.coverage_areas
                            .length
                        }{" "}
                        area(s)
                      </strong>
                    </div>

                    <div>
                      <span>
                        Submitted
                      </span>

                      <strong>
                        {formatDate(
                          profile.submitted_at,
                        )}
                      </strong>
                    </div>
                  </div>


                  <div
                    className={
                      styles.areas
                    }
                  >
                    {profile.coverage_areas.map(
                      (
                        coverage,
                      ) => (
                        <span
                          key={
                            coverage.area.id
                          }
                        >
                          {
                            coverage.area.name
                          }
                        </span>
                      ),
                    )}
                  </div>


                  {profile.rejection_reason ? (
                    <div
                      className={
                        styles.rejectionNote
                      }
                    >
                      <strong>
                        Previous review note
                      </strong>

                      <p>
                        {
                          profile.rejection_reason
                        }
                      </p>
                    </div>
                  ) : null}


                  <section
                    className={
                      styles.documents
                    }
                  >
                    <div
                      className={
                        styles.documentsHeader
                      }
                    >
                      <div>
                        <span>
                          <ShieldCheck
                            aria-hidden="true"
                          />

                          Protected files
                        </span>

                        <strong>
                          Verification documents
                        </strong>
                      </div>

                      <b>
                        {
                          profile.documents
                            .length
                        }
                      </b>
                    </div>


                    {profile.documents.length ===
                    0 ? (
                      <div
                        className={
                          styles.noDocuments
                        }
                      >
                        <FileImage
                          aria-hidden="true"
                        />

                        <div>
                          <strong>
                            No documents uploaded
                          </strong>

                          <p>
                            The applicant must
                            upload at least one
                            current verification
                            document before
                            approval.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={
                          styles.documentList
                        }
                      >
                        {profile.documents.map(
                          (
                            document,
                          ) => {
                            const unavailable =
                              Boolean(
                                document.purged_at,
                              );


                            const documentBusy =
                              documentWorkingId ===
                              document.id;


                            return (
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
                                    styles.documentIcon
                                  }
                                >
                                  {unavailable ? (
                                    <Trash2
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <FileImage
                                      aria-hidden="true"
                                    />
                                  )}
                                </span>


                                <div
                                  className={
                                    styles.documentInfo
                                  }
                                >
                                  <strong>
                                    {documentLabel(
                                      document,
                                    )}
                                  </strong>

                                  <span>
                                    {unavailable
                                      ? "Physical file removed after retention period"
                                      : document.status ===
                                          "pending"
                                        ? "Protected file awaiting review"
                                        : `Review ${document.status}`}
                                  </span>

                                  {document.reviewed_at ? (
                                    <small>
                                      Reviewed{" "}
                                      {formatDate(
                                        document.reviewed_at,
                                      )}
                                    </small>
                                  ) : null}

                                  {document.rejection_reason ? (
                                    <small
                                      className={
                                        styles.documentReason
                                      }
                                    >
                                      {
                                        document.rejection_reason
                                      }
                                    </small>
                                  ) : null}
                                </div>


                                <div
                                  className={
                                    styles.documentStatus
                                  }
                                >
                                  <StatusBadge
                                    status={
                                      document.status
                                    }
                                  />
                                </div>


                                <div
                                  className={
                                    styles.documentActions
                                  }
                                >
                                  {unavailable ? (
                                    <span
                                      className={
                                        styles.removedLabel
                                      }
                                    >
                                      Removed
                                    </span>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        disabled={
                                          Boolean(
                                            documentWorkingId,
                                          )
                                        }
                                        onClick={
                                          () => {
                                            void openDocument(
                                              profile,
                                              document,
                                              false,
                                            );
                                          }
                                        }
                                      >
                                        {documentBusy ? (
                                          <Loader2
                                            aria-hidden="true"
                                          />
                                        ) : (
                                          <Eye
                                            aria-hidden="true"
                                          />
                                        )}

                                        Preview
                                      </button>


                                      <button
                                        type="button"
                                        disabled={
                                          Boolean(
                                            documentWorkingId,
                                          )
                                        }
                                        onClick={
                                          () => {
                                            void openDocument(
                                              profile,
                                              document,
                                              true,
                                            );
                                          }
                                        }
                                      >
                                        <Download
                                          aria-hidden="true"
                                        />

                                        Download
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </section>


                  {status ===
                  "pending" ? (
                    <>
                      {!canApprove ? (
                        <p
                          className={
                            styles.approvalWarning
                          }
                        >
                          A current pending
                          verification document
                          is required before
                          approval.
                        </p>
                      ) : null}


                      <div
                        className={
                          adminTable.actions
                        }
                      >
                        <button
                          type="button"
                          className={
                            adminTable.successButton
                          }
                          disabled={
                            workingId ===
                              profile.id
                            || !canApprove
                          }
                          onClick={
                            () => {
                              void approve(
                                profile,
                              );
                            }
                          }
                        >
                          <Check
                            aria-hidden="true"
                          />

                          Approve
                        </button>


                        <button
                          type="button"
                          className={
                            adminTable.dangerButton
                          }
                          disabled={
                            workingId ===
                            profile.id
                          }
                          onClick={
                            () => {
                              setRejectTarget(
                                profile,
                              );
                            }
                          }
                        >
                          <X
                            aria-hidden="true"
                          />

                          Reject
                        </button>
                      </div>
                    </>
                  ) : null}
                </article>
              );
            },
          )}
        </div>
      ) : null}


      <DecisionDialog
        open={
          Boolean(
            rejectTarget,
          )
        }
        title="Reject this application?"
        description={
          "Give the applicant a specific explanation so they understand "
          + "what evidence or information is missing."
        }
        confirmLabel="Reject application"
        placeholder="Explain the verification issue clearly…"
        minimumLength={
          10
        }
        tone="danger"
        submitting={
          Boolean(
            rejectTarget
            && workingId ===
              rejectTarget.id,
          )
        }
        onCancel={
          () => {
            setRejectTarget(
              null,
            );
          }
        }
        onConfirm={
          reject
        }
      />
    </div>
  );
}