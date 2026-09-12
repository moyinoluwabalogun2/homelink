"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { getApiErrorMessage } from "@/lib/api-errors";
import { authService } from "@/services/auth-service";

import styles from "@/components/auth/AuthForm.module.css";


const schema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address."),
});


type FormValues = z.infer<
  typeof schema
>;


export default function ForgotPasswordPage() {
  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    submittedEmail,
    setSubmittedEmail,
  ] = useState("");

  const [
    isResending,
    setIsResending,
  ] = useState(false);


  const {
    register,
    handleSubmit,

    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<FormValues>({
    resolver:
      zodResolver(schema),

    defaultValues: {
      email: "",
    },
  });


  const sendResetLink =
    async (
      email: string,
    ) => {
      const response =
        await authService
          .forgotPassword(
            email,
          );

      setSubmittedEmail(
        email,
      );

      setMessage(
        response.message,
      );
    };


  const submit =
    handleSubmit(
      async ({
        email,
      }) => {
        try {
          await sendResetLink(
            email,
          );
        } catch (
          error
        ) {
          toast.error(
            getApiErrorMessage(
              error,
            ),
          );
        }
      },
    );


  const resend =
    async () => {
      if (
        !submittedEmail ||
        isResending
      ) {
        return;
      }


      setIsResending(
        true,
      );


      try {
        await sendResetLink(
          submittedEmail,
        );

        toast.success(
          "Reset instructions requested again.",
        );
      } catch (
        error
      ) {
        toast.error(
          getApiErrorMessage(
            error,
          ),
        );
      } finally {
        setIsResending(
          false,
        );
      }
    };


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


          {message ? (
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
                  Check your inbox
                </span>

                <h1>
                  Reset instructions sent
                </h1>

                <p>
                  {message}
                </p>
              </header>


              <div
                className={
                  styles.recoveryNotice
                }
              >
                <Mail
                  aria-hidden="true"
                />

                <div>
                  <strong>
                    Check your email
                  </strong>

                  <p>
                    We sent reset
                    instructions for{" "}
                    <span>
                      {
                        submittedEmail
                      }
                    </span>
                    .
                  </p>
                </div>
              </div>


              <p
                className={
                  styles.recoverySecurityText
                }
              >
                For security, HomeLink
                displays the same response
                whether or not an account
                exists for that email.
              </p>


              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                disabled={
                  isResending
                }
                onClick={
                  resend
                }
              >
                {isResending ? (
                  <Loader2
                    className={
                      styles.spinner
                    }
                    aria-hidden="true"
                  />
                ) : (
                  <Send
                    aria-hidden="true"
                  />
                )}

                {isResending
                  ? "Sending…"
                  : "Send again"}
              </button>


              <Link
                href="/login"
                className={
                  styles.primaryLinkButton
                }
              >
                Return to sign in
              </Link>
            </>
          ) : (
            <>
              <div
                className={
                  styles.recoveryStatusIcon
                }
              >
                <Mail
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
                  Password recovery
                </span>

                <h1>
                  Reset your password
                </h1>

                <p>
                  Enter the email
                  associated with your
                  HomeLink account and
                  we&apos;ll send you
                  secure password reset
                  instructions.
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
                    htmlFor="email"
                  >
                    Email address
                  </label>


                  <div
                    className={
                      styles.inputWrap
                    }
                  >
                    <Mail
                      aria-hidden="true"
                    />

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={
                        styles.input
                      }
                      {...register(
                        "email",
                      )}
                    />
                  </div>


                  {errors.email ? (
                    <p
                      className={
                        styles.error
                      }
                    >
                      {
                        errors.email
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
                    <Send
                      aria-hidden="true"
                    />
                  )}

                  {isSubmitting
                    ? "Sending…"
                    : "Send reset link"}
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
          Remembered your password?{" "}
          <Link href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}