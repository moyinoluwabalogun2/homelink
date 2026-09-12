"use client";

import {
  Suspense,
  useState,
} from "react";

import Link from "next/link";

import {
  useSearchParams,
} from "next/navigation";

import {
  zodResolver,
} from "@hookform/resolvers/zod";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
} from "lucide-react";

import {
  useForm,
} from "react-hook-form";

import {
  toast,
} from "sonner";

import {
  z,
} from "zod";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  authService,
} from "@/services/auth-service";

import styles from "@/components/auth/AuthForm.module.css";


const schema =
  z
    .object({
      password:
        z
          .string()
          .min(
            10,
            "Use at least 10 characters.",
          )
          .regex(
            /[a-z]/,
            "Add a lowercase letter.",
          )
          .regex(
            /[A-Z]/,
            "Add an uppercase letter.",
          )
          .regex(
            /[0-9]/,
            "Add a number.",
          ),

      confirmPassword:
        z.string(),
    })
    .refine(
      (
        values,
      ) =>
        values.password ===
        values.confirmPassword,
      {
        path: [
          "confirmPassword",
        ],

        message:
          "Passwords do not match.",
      },
    );


type FormValues =
  z.infer<typeof schema>;


function ResetPasswordForm() {
  const searchParams =
    useSearchParams();

  const token =
    searchParams.get(
      "token",
    ) ?? "";


  const [
    complete,
    setComplete,
  ] =
    useState(false);


  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);


  const [
    showConfirmation,
    setShowConfirmation,
  ] =
    useState(false);


  const {
    register,
    handleSubmit,
    watch,

    formState: {
      errors,
      isSubmitting,
    },
  } =
    useForm<FormValues>({
      resolver:
        zodResolver(
          schema,
        ),

      defaultValues: {
        password: "",
        confirmPassword: "",
      },
    });


  const password =
    watch(
      "password",
    ) ?? "";


  const requirements = [
    {
      label:
        "At least 10 characters",

      passed:
        password.length >=
        10,
    },

    {
      label:
        "One uppercase letter",

      passed:
        /[A-Z]/.test(
          password,
        ),
    },

    {
      label:
        "One lowercase letter",

      passed:
        /[a-z]/.test(
          password,
        ),
    },

    {
      label:
        "At least one number",

      passed:
        /[0-9]/.test(
          password,
        ),
    },
  ];


  const submit =
    handleSubmit(
      async ({
        password:
          nextPassword,
      }) => {
        if (!token) {
          toast.error(
            "This password reset link is incomplete.",
          );

          return;
        }


        try {
          await authService
            .resetPassword(
              token,
              nextPassword,
            );

          setComplete(
            true,
          );
        } catch (
          error
        ) {
          toast.error(
            getApiErrorMessage(
              error,
              "Password reset failed.",
            ),
          );
        }
      },
    );


  return (
    <main
      className={
        styles.recoveryPage
      }
    >
      <div
        className={
          styles.recoveryShell
        }
      >
        <div
          className={
            styles.recoveryBrand
          }
        >
          <Link href="/">
            HomeLink
          </Link>

          <span>
            <ShieldCheck
              aria-hidden="true"
            />

            Account security
          </span>
        </div>


        <section
          className={
            styles.recoveryCard
          }
        >
          <Link
            href="/login"
            className={
              styles.recoveryBack
            }
          >
            <ArrowLeft
              aria-hidden="true"
            />

            Back to sign in
          </Link>


          {!token ? (
            <>
              <div
                className={
                  styles.recoveryWarningIcon
                }
              >
                <AlertTriangle
                  aria-hidden="true"
                />
              </div>


              <header
                className={
                  styles.recoveryHeader
                }
              >
                <span
                  className={
                    styles.formEyebrow
                  }
                >
                  Invalid reset link
                </span>

                <h1>
                  This link is incomplete
                </h1>

                <p>
                  HomeLink could not find
                  the password reset token
                  required to continue.
                  Request a new reset link
                  and try again.
                </p>
              </header>


              <Link
                href="/forgot-password"
                className={
                  styles.primaryLinkButton
                }
              >
                Request a new link
              </Link>
            </>
          ) : complete ? (
            <>
              <div
                className={
                  styles.recoveryStatusIcon
                }
              >
                <CheckCircle2
                  aria-hidden="true"
                />
              </div>


              <header
                className={
                  styles.recoveryHeader
                }
              >
                <span
                  className={
                    styles.formEyebrow
                  }
                >
                  Password updated
                </span>

                <h1>
                  You&apos;re all set
                </h1>

                <p>
                  Your HomeLink password
                  has been changed
                  successfully. You can
                  now sign in using your
                  new password.
                </p>
              </header>


              <Link
                href="/login"
                className={
                  styles.primaryLinkButton
                }
              >
                Sign in to HomeLink
              </Link>
            </>
          ) : (
            <>
              <div
                className={
                  styles.recoveryStatusIcon
                }
              >
                <KeyRound
                  aria-hidden="true"
                />
              </div>


              <header
                className={
                  styles.recoveryHeader
                }
              >
                <span
                  className={
                    styles.formEyebrow
                  }
                >
                  Account security
                </span>

                <h1>
                  Choose a new password
                </h1>

                <p>
                  Create a strong new
                  password for your
                  HomeLink account.
                </p>
              </header>


              <form
                className={
                  styles.form
                }
                onSubmit={
                  submit
                }
                noValidate
              >
                <div
                  className={
                    styles.field
                  }
                >
                  <label
                    htmlFor="password"
                  >
                    New password
                  </label>


                  <div
                    className={
                      styles.inputWrap
                    }
                  >
                    <LockKeyhole
                      aria-hidden="true"
                    />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      placeholder="Enter a strong password"
                      className={
                        styles.passwordInput
                      }
                      {...register(
                        "password",
                      )}
                    />


                    <button
                      type="button"
                      className={
                        styles.passwordButton
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowPassword(
                          (
                            current,
                          ) =>
                            !current,
                        )
                      }
                    >
                      {showPassword ? (
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


                  {errors.password ? (
                    <p
                      className={
                        styles.error
                      }
                    >
                      {
                        errors
                          .password
                          .message
                      }
                    </p>
                  ) : null}
                </div>


                <div
                  className={
                    styles.passwordRequirements
                  }
                >
                  <strong>
                    Password requirements
                  </strong>

                  <div>
                    {requirements.map(
                      (
                        requirement,
                      ) => (
                        <span
                          key={
                            requirement
                              .label
                          }
                          className={
                            requirement
                              .passed
                              ? styles
                                  .requirementPassed
                              : undefined
                          }
                        >
                          <Check
                            aria-hidden="true"
                          />

                          {
                            requirement
                              .label
                          }
                        </span>
                      ),
                    )}
                  </div>
                </div>


                <div
                  className={
                    styles.field
                  }
                >
                  <label
                    htmlFor="confirmPassword"
                  >
                    Confirm new password
                  </label>


                  <div
                    className={
                      styles.inputWrap
                    }
                  >
                    <LockKeyhole
                      aria-hidden="true"
                    />

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmation
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      placeholder="Enter it again"
                      className={
                        styles.passwordInput
                      }
                      {...register(
                        "confirmPassword",
                      )}
                    />


                    <button
                      type="button"
                      className={
                        styles.passwordButton
                      }
                      aria-label={
                        showConfirmation
                          ? "Hide confirmation password"
                          : "Show confirmation password"
                      }
                      onClick={() =>
                        setShowConfirmation(
                          (
                            current,
                          ) =>
                            !current,
                        )
                      }
                    >
                      {showConfirmation ? (
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


                  {errors
                    .confirmPassword ? (
                    <p
                      className={
                        styles.error
                      }
                    >
                      {
                        errors
                          .confirmPassword
                          .message
                      }
                    </p>
                  ) : null}
                </div>


                <button
                  type="submit"
                  className={
                    styles.submitButton
                  }
                  disabled={
                    isSubmitting
                  }
                >
                  {isSubmitting ? (
                    <Loader2
                      className={
                        styles.spinner
                      }
                      aria-hidden="true"
                    />
                  ) : (
                    <Save
                      aria-hidden="true"
                    />
                  )}

                  {isSubmitting
                    ? "Updating…"
                    : "Update password"}
                </button>
              </form>
            </>
          )}
        </section>


        <p
          className={
            styles.recoveryFooter
          }
        >
          Need another reset link?{" "}
          <Link
            href="/forgot-password"
          >
            Start again
          </Link>
        </p>
      </div>
    </main>
  );
}


function ResetPasswordFallback() {
  return (
    <main
      className={
        styles.recoveryPage
      }
    >
      <div
        className={
          styles.recoveryShell
        }
      >
        <section
          className={
            styles.recoveryCard
          }
        >
          <div
            className={
              styles.recoveryLoading
            }
          >
            <Loader2
              className={
                styles.spinner
              }
              aria-hidden="true"
            />

            <span>
              Preparing password reset…
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}


export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <ResetPasswordFallback />
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}