"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  MailCheck,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api-errors";
import { accountService } from "@/services/account-service";
import styles from "./VerifyEmailClient.module.css";

type VerificationState =
  | "loading"
  | "success"
  | "error";

const DEFAULT_LOADING_MESSAGE =
  "We are securely confirming your HomeLink email address.";

const DEFAULT_ERROR_MESSAGE =
  "This verification link is invalid, expired, or has already been used.";

function removeVerificationTokenFromAddressBar() {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(
    {},
    "",
    "/verify-email",
  );
}

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = (
    searchParams.get("token") ?? ""
  ).trim();

  const verificationStarted = useRef(false);

  const [state, setState] =
    useState<VerificationState>("loading");

  const [message, setMessage] = useState(
    DEFAULT_LOADING_MESSAGE,
  );

  useEffect(() => {
    if (verificationStarted.current) {
      return;
    }

    verificationStarted.current = true;

    if (!token) {
      setState("error");
      setMessage(
        "The verification token is missing. Please use the complete link from your HomeLink email.",
      );
      return;
    }

    let active = true;

    const verifyEmail = async () => {
      try {
        const result =
          await accountService.confirmEmailVerification(
            token,
          );

        if (!active) {
          return;
        }

        setState("success");
        setMessage(
          result.message ||
            "Your HomeLink email address has been verified successfully.",
        );

        removeVerificationTokenFromAddressBar();
      } catch (reason) {
        if (!active) {
          return;
        }

        setState("error");
        setMessage(
          getApiErrorMessage(
            reason,
            DEFAULT_ERROR_MESSAGE,
          ),
        );

        removeVerificationTokenFromAddressBar();
      }
    };

    void verifyEmail();

    return () => {
      active = false;
    };
  }, [token]);

  const isLoading = state === "loading";
  const isSuccess = state === "success";
  const isError = state === "error";

  const title = isLoading
    ? "Verifying your email."
    : isSuccess
      ? "Email verified."
      : "Verification unsuccessful.";

  return (
    <section
      className={styles.card}
      aria-busy={isLoading}
      aria-labelledby="verification-title"
      aria-describedby="verification-message"
    >
      <span
        className={[
          styles.icon,
          isError ? styles.errorIcon : "",
          isLoading ? styles.loadingIcon : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        {isLoading ? (
          <Loader2 className={styles.spinner} />
        ) : isSuccess ? (
          <CheckCircle2 />
        ) : (
          <XCircle />
        )}
      </span>

      <span className={styles.eyebrow}>
        <MailCheck aria-hidden="true" />
        Email verification
      </span>

      <h1 id="verification-title">
        {title}
      </h1>

      <p
        id="verification-message"
        className={styles.message}
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
      >
        {message}
      </p>

      {isLoading ? (
        <div
          className={styles.progress}
          aria-hidden="true"
        >
          <span />
        </div>
      ) : null}

      {isSuccess ? (
        <div className={styles.actions}>
          <Link
            className={styles.primaryAction}
            href="/login"
          >
            Continue to sign in
          </Link>

          <Link
            className={styles.secondaryAction}
            href="/dashboard/account"
          >
            Open account settings
          </Link>
        </div>
      ) : null}

      {isError ? (
        <div className={styles.actions}>
          <Link
            className={styles.primaryAction}
            href="/login"
          >
            Go to sign in
          </Link>

          <Link
            className={styles.secondaryAction}
            href="/support"
          >
            Contact HomeLink support
          </Link>

          <p className={styles.helpText}>
            If you are already signed in, you can request
            another verification email from your account
            settings.
          </p>
        </div>
      ) : null}

      <p className={styles.securityNote}>
        HomeLink will never ask for your password through an
        email-verification link.
      </p>
    </section>
  );
}