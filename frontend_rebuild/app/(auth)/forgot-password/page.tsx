"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  zodResolver,
} from "@hookform/resolvers/zod";

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";

import {
  useForm,
} from "react-hook-form";

import { toast } from "sonner";
import { z } from "zod";

import { getApiErrorMessage } from "@/lib/api-errors";
import { authService } from "@/services/auth-service";

import styles from "@/components/auth/AuthForm.module.css";

const schema =
  z.object({
    email:
      z
        .string()
        .trim()
        .email(
          "Enter a valid email address.",
        ),
  });

type FormValues =
  z.infer<
    typeof schema
  >;

const GENERIC_SUCCESS_MESSAGE =
  "If a HomeLink account exists for that email, password reset instructions have been sent.";

const RESEND_COOLDOWN_SECONDS =
  30;

export default function ForgotPasswordPage() {
  const [
    complete,
    setComplete,
  ] = useState(false);

  const [
    submittedEmail,
    setSubmittedEmail,
  ] = useState("");

  const [
    isResending,
    setIsResending,
  ] = useState(false);

  const [
    cooldown,
    setCooldown,
  ] = useState(0);

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

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setCooldown(
            (current) =>
              Math.max(
                0,
                current - 1,
              ),
          );
        },
        1_000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [cooldown]);

  const sendResetLink =
    async (
      email: string,
    ) => {
      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      await authService
        .forgotPassword(
          normalizedEmail,
        );

      setSubmittedEmail(
        normalizedEmail,
      );

      setComplete(true);

      setCooldown(
        RESEND_COOLDOWN_SECONDS,
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
        } catch (error) {
          toast.error(
            getApiErrorMessage(
              error,
              "Password reset instructions could not be requested right now.",
            ),
          );
        }
      },
    );

  const resend =
    async () => {
      if (
        !submittedEmail ||
        isResending ||
        cooldown > 0
      ) {
        return;
      }

      setIsResending(true);

      try {
        await authService
          .forgotPassword(
            submittedEmail,
          );

        setCooldown(
          RESEND_COOLDOWN_SECONDS,
        );

        toast.success(
          "Reset instructions requested again.",
        );
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            "Reset instructions could not be requested again right now.",
          ),
        );
      } finally {
        setIsResending(false);
      }
    };

  return (
    <main className={styles.recoveryPage}>
      <div className={styles.recoveryShell}>
        <div className={styles.recoveryBrand}>
          <Link href="/">
            HomeLink
          </Link>

          <span>
            <ShieldCheck aria-hidden="true" />
            Account security
          </span>
        </div>

        <section className={styles.recoveryCard}>
          <Link
            href="/login"
            className={styles.recoveryBack}
          >
            <ArrowLeft aria-hidden="true" />
            Back to sign in
          </Link>

          {complete ? (
            <>
              <div className={styles.recoveryStatusIcon}>
                <CheckCircle2 aria-hidden="true" />
              </div>

              <header className={styles.recoveryHeader}>
                <span className={styles.formEyebrow}>
                  Check your inbox
                </span>

                <h1>
                  Reset instructions requested
                </h1>

                <p>
                  {GENERIC_SUCCESS_MESSAGE}
                </p>
              </header>

              <div className={styles.recoveryNotice}>
                <Mail aria-hidden="true" />

                <div>
                  <strong>
                    Check your email
                  </strong>

                  <p>
                    We processed a reset request for{" "}

                    <span>
                      {submittedEmail}
                    </span>
                    .
                  </p>
                </div>
              </div>

              <p className={styles.recoverySecurityText}>
                For security, HomeLink displays the same
                response whether or not an account exists
                for that email.
              </p>

              <button
                type="button"
                className={styles.secondaryButton}
                disabled={
                  isResending ||
                  cooldown > 0
                }
                onClick={resend}
              >
                {isResending ? (
                  <Loader2
                    className={styles.spinner}
                    aria-hidden="true"
                  />
                ) : (
                  <Send aria-hidden="true" />
                )}

                {isResending
                  ? "Sending…"
                  : cooldown > 0
                    ? `Send again in ${cooldown}s`
                    : "Send again"}
              </button>

              <Link
                href="/login"
                className={styles.primaryLinkButton}
              >
                Return to sign in
              </Link>
            </>
          ) : (
            <>
              <div className={styles.recoveryStatusIcon}>
                <Mail aria-hidden="true" />
              </div>

              <header className={styles.recoveryHeader}>
                <span className={styles.formEyebrow}>
                  Password recovery
                </span>

                <h1>
                  Reset your password
                </h1>

                <p>
                  Enter the email associated with your
                  HomeLink account and we&apos;ll process
                  a secure password reset request.
                </p>
              </header>

              <form
                className={styles.form}
                onSubmit={submit}
                noValidate
              >
                <div className={styles.field}>
                  <label htmlFor="forgot-email">
                    Email address
                  </label>

                  <div className={styles.inputWrap}>
                    <Mail aria-hidden="true" />

                    <input
                      id="forgot-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="you@example.com"
                      className={styles.input}
                      aria-invalid={
                        errors.email
                          ? true
                          : undefined
                      }
                      aria-describedby={
                        errors.email
                          ? "forgot-email-error"
                          : undefined
                      }
                      {...register(
                        "email",
                      )}
                    />
                  </div>

                  {errors.email ? (
                    <p
                      id="forgot-email-error"
                      className={styles.error}
                      role="alert"
                    >
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2
                      className={styles.spinner}
                      aria-hidden="true"
                    />
                  ) : (
                    <Send aria-hidden="true" />
                  )}

                  {isSubmitting
                    ? "Sending…"
                    : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </section>

        <p className={styles.recoveryFooter}>
          Remembered your password?{" "}

          <Link href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}