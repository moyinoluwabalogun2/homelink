"use client";

import {
  type FormEvent,
  useState,
} from "react";

import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  toast,
} from "sonner";

import shared from "@/components/dashboard/DashboardPage.module.css";

import {
  useAuth,
} from "@/context/AuthContext";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatDate,
  titleCase,
} from "@/lib/formatters";

import {
  accountService,
} from "@/services/account-service";

import {
  authService,
} from "@/services/auth-service";

import styles from "./page.module.css";


type BusyOperation =
  | "password"
  | "export"
  | "delete"
  | null;


export default function AccountPage() {
  const router =
    useRouter();

  const {
    user,
    logout,
  } = useAuth();


  const [
    exportPassword,
    setExportPassword,
  ] = useState("");

  const [
    deletePassword,
    setDeletePassword,
  ] = useState("");

  const [
    deleteText,
    setDeleteText,
  ] = useState("");

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showExportPassword,
    setShowExportPassword,
  ] = useState(false);

  const [
    showDeletePassword,
    setShowDeletePassword,
  ] = useState(false);

  const [
    busy,
    setBusy,
  ] = useState<BusyOperation>(
    null,
  );


  const operationBusy =
    busy !== null;

  const passwordsMatch =
    newPassword ===
    confirmPassword;

  const passwordFormReady =
    currentPassword.length > 0
    &&
    newPassword.length >= 10
    &&
    confirmPassword.length > 0
    &&
    passwordsMatch;

  const deletionConfirmed =
    deleteText.trim() ===
    "DELETE";


  const exportData =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        operationBusy ||
        !exportPassword
      ) {
        return;
      }

      setBusy("export");

      try {
        const data =
          await accountService
            .exportData(
              exportPassword,
            );

        const blob =
          new Blob(
            [
              JSON.stringify(
                data,
                null,
                2,
              ),
            ],
            {
              type:
                "application/json",
            },
          );

        const url =
          URL.createObjectURL(
            blob,
          );

        const anchor =
          document.createElement(
            "a",
          );

        anchor.href = url;

        anchor.download =
          `homelink-account-export-${
            new Date()
              .toISOString()
              .slice(
                0,
                10,
              )
          }.json`;

        anchor.style.display =
          "none";

        document.body.appendChild(
          anchor,
        );

        anchor.click();
        anchor.remove();

        window.setTimeout(
          () => {
            URL.revokeObjectURL(
              url,
            );
          },
          1_000,
        );

        setExportPassword("");

        toast.success(
          "Your account export is ready.",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Your account export could not be prepared.",
          ),
        );
      } finally {
        setBusy(null);
      }
    };


  const changePassword =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (operationBusy) {
        return;
      }

      if (
        newPassword.length < 10
      ) {
        toast.error(
          "Your new password must contain at least 10 characters.",
        );

        return;
      }

      if (!passwordsMatch) {
        toast.error(
          "The new passwords do not match.",
        );

        return;
      }

      setBusy("password");

      try {
        const result =
          await authService
            .changePassword(
              currentPassword,
              newPassword,
            );

        toast.success(
          result.message,
        );

        await logout().catch(
          () => undefined,
        );

        router.replace(
          "/login",
        );
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Your password could not be changed.",
          ),
        );
      } finally {
        setBusy(null);
      }
    };


  const deleteAccount =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (operationBusy) {
        return;
      }

      if (!deletionConfirmed) {
        toast.error(
          "Type DELETE to confirm account deletion.",
        );

        return;
      }

      if (!deletePassword) {
        toast.error(
          "Enter your current password.",
        );

        return;
      }

      setBusy("delete");

      try {
        await accountService
          .deleteAccount(
            deletePassword,
          );

        await logout().catch(
          () => undefined,
        );

        toast.success(
          "Your account has been deleted.",
        );

        router.replace("/");
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Your account could not be deleted.",
          ),
        );
      } finally {
        setBusy(null);
      }
    };


  return (
    <div className={shared.page}>
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
            <User
              aria-hidden="true"
            />

            Profile and privacy
          </span>

          <h1>
            Account settings.
          </h1>

          <p>
            Review your identity,
            strengthen account security
            and control your HomeLink
            information.
          </p>
        </div>
      </header>


      <section
        className={
          styles.profileSection
        }
        aria-labelledby={
          "account-profile-title"
        }
      >
        <div
          className={
            styles.profileHeading
          }
        >
          <div>
            <span
              className={
                styles.profileIcon
              }
            >
              <User
                aria-hidden="true"
              />
            </span>

            <div>
              <span>
                Account identity
              </span>

              <h2
                id={
                  "account-profile-title"
                }
              >
                Your HomeLink profile
              </h2>
            </div>
          </div>

          <span
            className={
              styles.accountStatus
            }
          >
            <CheckCircle2
              aria-hidden="true"
            />

            Active account
          </span>
        </div>


        <div
          className={
            styles.profileCard
          }
        >
          <div>
            <span>
              Full name
            </span>

            <strong>
              {user?.full_name ||
                "Not available"}
            </strong>
          </div>

          <div>
            <span>
              Email
            </span>

            <strong>
              {user?.email ||
                "Not available"}
            </strong>
          </div>

          <div>
            <span>
              Phone
            </span>

            <strong>
              {user?.phone ||
                "Not added"}
            </strong>
          </div>

          <div>
            <span>
              Account role
            </span>

            <strong>
              {titleCase(
                user?.role ??
                  "user",
              )}
            </strong>
          </div>

          <div>
            <span>
              Member since
            </span>

            <strong>
              {user?.created_at
                ? formatDate(
                    user.created_at,
                  )
                : "Not available"}
            </strong>
          </div>

          <div>
            <span>
              Email protection
            </span>

            <strong
              className={
                styles.profileStatus
              }
            >
              <ShieldCheck
                aria-hidden="true"
              />

              {user
                ?.is_email_verified
                ? "Verified"
                : "Verification optional"}
            </strong>
          </div>
        </div>
      </section>


      <section
        className={
          styles.formGrid
        }
        aria-label={
          "Account security and data"
        }
      >
        <article
          className={
            styles.formCard
          }
        >
          <div
            className={
              styles.formHeader
            }
          >
            <span
              className={
                styles.sectionIcon
              }
            >
              <KeyRound
                aria-hidden="true"
              />
            </span>

            <div>
              <span>
                Account security
              </span>

              <h2>
                Change password
              </h2>
            </div>
          </div>

          <p>
            Choose a strong password you
            do not use elsewhere. All
            active HomeLink sessions will
            be signed out afterwards.
          </p>


          <form
            className={
              styles.form
            }
            onSubmit={
              changePassword
            }
          >
            <label
              className={
                styles.field
              }
              htmlFor={
                "current-password"
              }
            >
              <span>
                Current password
              </span>

              <div
                className={
                  styles.passwordWrap
                }
              >
                <input
                  id={
                    "current-password"
                  }
                  name={
                    "current-password"
                  }
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    currentPassword
                  }
                  onChange={(
                    event,
                  ) => {
                    setCurrentPassword(
                      event.target.value,
                    );
                  }}
                  autoComplete={
                    "current-password"
                  }
                  disabled={
                    operationBusy
                  }
                  required
                />

                <button
                  type="button"
                  className={
                    styles.passwordToggle
                  }
                  onClick={() => {
                    setShowCurrentPassword(
                      (current) =>
                        !current,
                    );
                  }}
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                  aria-pressed={
                    showCurrentPassword
                  }
                >
                  {showCurrentPassword ? (
                    <EyeOff
                      aria-hidden="true"
                    />
                  ) : (
                    <Eye
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>
            </label>


            <label
              className={
                styles.field
              }
              htmlFor={
                "new-password"
              }
            >
              <span>
                New password
              </span>

              <div
                className={
                  styles.passwordWrap
                }
              >
                <input
                  id={
                    "new-password"
                  }
                  name={
                    "new-password"
                  }
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    newPassword
                  }
                  onChange={(
                    event,
                  ) => {
                    setNewPassword(
                      event.target.value,
                    );
                  }}
                  autoComplete={
                    "new-password"
                  }
                  minLength={10}
                  disabled={
                    operationBusy
                  }
                  aria-describedby={
                    "new-password-hint"
                  }
                  required
                />

                <button
                  type="button"
                  className={
                    styles.passwordToggle
                  }
                  onClick={() => {
                    setShowNewPassword(
                      (current) =>
                        !current,
                    );
                  }}
                  aria-label={
                    showNewPassword
                      ? "Hide new password"
                      : "Show new password"
                  }
                  aria-pressed={
                    showNewPassword
                  }
                >
                  {showNewPassword ? (
                    <EyeOff
                      aria-hidden="true"
                    />
                  ) : (
                    <Eye
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>

              <small
                id={
                  "new-password-hint"
                }
              >
                Use at least 10
                characters.
              </small>
            </label>


            <label
              className={
                styles.field
              }
              htmlFor={
                "confirm-new-password"
              }
            >
              <span>
                Confirm new password
              </span>

              <input
                id={
                  "confirm-new-password"
                }
                name={
                  "confirm-new-password"
                }
                type={
                  showNewPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                onChange={(
                  event,
                ) => {
                  setConfirmPassword(
                    event.target.value,
                  );
                }}
                autoComplete={
                  "new-password"
                }
                minLength={10}
                disabled={
                  operationBusy
                }
                aria-invalid={
                  confirmPassword.length >
                    0 &&
                  !passwordsMatch
                    ? true
                    : undefined
                }
                aria-describedby={
                  confirmPassword.length >
                    0 &&
                  !passwordsMatch
                    ? "password-match-error"
                    : undefined
                }
                required
              />

              {confirmPassword.length >
                0 &&
              !passwordsMatch ? (
                <small
                  id={
                    "password-match-error"
                  }
                  className={
                    styles.fieldError
                  }
                  role="alert"
                >
                  The passwords do not
                  match.
                </small>
              ) : null}
            </label>


            <button
              type="submit"
              className={
                shared.primaryButton
              }
              disabled={
                operationBusy ||
                !passwordFormReady
              }
            >
              {busy ===
              "password" ? (
                <Loader2
                  className={
                    styles.spinner
                  }
                  aria-hidden="true"
                />
              ) : (
                <KeyRound
                  aria-hidden="true"
                />
              )}

              {busy ===
              "password"
                ? "Updating…"
                : "Update password"}
            </button>
          </form>
        </article>


        <article
          className={
            styles.formCard
          }
        >
          <div
            className={
              styles.formHeader
            }
          >
            <span
              className={
                styles.sectionIcon
              }
            >
              <Download
                aria-hidden="true"
              />
            </span>

            <div>
              <span>
                Your information
              </span>

              <h2>
                Export your data
              </h2>
            </div>
          </div>

          <p>
            Download a JSON record of
            your HomeLink account and
            associated platform activity.
          </p>


          <form
            className={
              styles.form
            }
            onSubmit={
              exportData
            }
          >
            <label
              className={
                styles.field
              }
              htmlFor={
                "export-password"
              }
            >
              <span>
                Confirm current password
              </span>

              <div
                className={
                  styles.passwordWrap
                }
              >
                <input
                  id={
                    "export-password"
                  }
                  name={
                    "export-password"
                  }
                  type={
                    showExportPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    exportPassword
                  }
                  onChange={(
                    event,
                  ) => {
                    setExportPassword(
                      event.target.value,
                    );
                  }}
                  autoComplete={
                    "current-password"
                  }
                  disabled={
                    operationBusy
                  }
                  required
                />

                <button
                  type="button"
                  className={
                    styles.passwordToggle
                  }
                  onClick={() => {
                    setShowExportPassword(
                      (current) =>
                        !current,
                    );
                  }}
                  aria-label={
                    showExportPassword
                      ? "Hide export password"
                      : "Show export password"
                  }
                  aria-pressed={
                    showExportPassword
                  }
                >
                  {showExportPassword ? (
                    <EyeOff
                      aria-hidden="true"
                    />
                  ) : (
                    <Eye
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>
            </label>


            <div
              className={
                styles.exportNotice
              }
            >
              <ShieldCheck
                aria-hidden="true"
              />

              <p>
                Your password is used
                only to authorise this
                export request.
              </p>
            </div>


            <button
              type="submit"
              className={
                shared.secondaryButton
              }
              disabled={
                operationBusy ||
                !exportPassword
              }
            >
              {busy ===
              "export" ? (
                <Loader2
                  className={
                    styles.spinner
                  }
                  aria-hidden="true"
                />
              ) : (
                <Download
                  aria-hidden="true"
                />
              )}

              {busy ===
              "export"
                ? "Preparing…"
                : "Download export"}
            </button>
          </form>
        </article>
      </section>


      <section
        className={
          styles.dangerZone
        }
        aria-labelledby={
          "delete-account-title"
        }
      >
        <div
          className={
            styles.dangerHeader
          }
        >
          <span
            className={
              styles.sectionIcon
            }
          >
            <Trash2
              aria-hidden="true"
            />
          </span>

          <div>
            <span>
              Irreversible action
            </span>

            <h2
              id={
                "delete-account-title"
              }
            >
              Delete account
            </h2>

            <p>
              This anonymises your
              account, removes access and
              ends active sessions. This
              action cannot be reversed.
            </p>
          </div>
        </div>


        <form
          className={
            styles.deleteForm
          }
          onSubmit={
            deleteAccount
          }
        >
          <div
            className={
              styles.deleteFields
            }
          >
            <label
              className={
                styles.field
              }
              htmlFor={
                "delete-password"
              }
            >
              <span>
                Current password
              </span>

              <div
                className={
                  styles.passwordWrap
                }
              >
                <input
                  id={
                    "delete-password"
                  }
                  name={
                    "delete-password"
                  }
                  type={
                    showDeletePassword
                      ? "text"
                      : "password"
                  }
                  value={
                    deletePassword
                  }
                  onChange={(
                    event,
                  ) => {
                    setDeletePassword(
                      event.target.value,
                    );
                  }}
                  autoComplete={
                    "current-password"
                  }
                  disabled={
                    operationBusy
                  }
                  required
                />

                <button
                  type="button"
                  className={
                    styles.passwordToggle
                  }
                  onClick={() => {
                    setShowDeletePassword(
                      (current) =>
                        !current,
                    );
                  }}
                  aria-label={
                    showDeletePassword
                      ? "Hide deletion password"
                      : "Show deletion password"
                  }
                  aria-pressed={
                    showDeletePassword
                  }
                >
                  {showDeletePassword ? (
                    <EyeOff
                      aria-hidden="true"
                    />
                  ) : (
                    <Eye
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>
            </label>


            <label
              className={
                styles.field
              }
              htmlFor={
                "delete-confirmation"
              }
            >
              <span>
                Type DELETE
              </span>

              <input
                id={
                  "delete-confirmation"
                }
                name={
                  "delete-confirmation"
                }
                type="text"
                value={deleteText}
                onChange={(
                  event,
                ) => {
                  setDeleteText(
                    event.target.value,
                  );
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="DELETE"
                disabled={
                  operationBusy
                }
                required
              />
            </label>
          </div>


          <button
            type="submit"
            className={
              shared.dangerButton
            }
            disabled={
              operationBusy ||
              !deletePassword ||
              !deletionConfirmed
            }
          >
            {busy ===
            "delete" ? (
              <Loader2
                className={
                  styles.spinner
                }
                aria-hidden="true"
              />
            ) : (
              <Trash2
                aria-hidden="true"
              />
            )}

            {busy ===
            "delete"
              ? "Deleting…"
              : "Delete account"}
          </button>
        </form>
      </section>
    </div>
  );
}