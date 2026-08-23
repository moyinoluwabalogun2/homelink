"use client";

import axios from "axios";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import {
  useSearchParams,
} from "next/navigation";

import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
} from "lucide-react";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatCurrency,
} from "@/lib/formatters";

import {
  paymentService,
} from "@/services/payment-service";

import type {
  Payment,
} from "@/types/payment";

import styles from "./PaymentCallbackClient.module.css";


type CallbackState =
  | "checking"
  | "success"
  | "pending"
  | "error";


function isTemporaryNetworkProblem(
  reason: unknown,
): boolean {
  if (
    !axios.isAxiosError(
      reason,
    )
  ) {
    return false;
  }

  if (
    reason.code ===
      "ECONNABORTED" ||
    reason.code ===
      "ETIMEDOUT" ||
    reason.code ===
      "ERR_NETWORK"
  ) {
    return true;
  }

  if (!reason.response) {
    return true;
  }

  return [
    502,
    503,
    504,
  ].includes(
    reason.response.status,
  );
}


export default function PaymentCallbackClient() {
  const searchParams =
    useSearchParams();

  const reference =
    searchParams.get(
      "reference",
    ) ??
    searchParams.get(
      "trxref",
    ) ??
    searchParams.get(
      "tx_ref",
    ) ??
    "";

  const [
    state,
    setState,
  ] =
    useState<CallbackState>(
      "checking",
    );

  const [
    payment,
    setPayment,
  ] =
    useState<Payment | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const verify =
    useCallback(
      async () => {
        if (!reference) {
          setState(
            "error",
          );

          setMessage(
            "The payment reference is missing from this callback URL.",
          );

          return;
        }

        setState(
          "checking",
        );

        setMessage(
          "",
        );

        try {
          const verified =
            await paymentService.verify(
              reference,
            );

          setPayment(
            verified,
          );

          if (
            verified.status ===
            "success"
          ) {
            setState(
              "success",
            );

            return;
          }

          setState(
            "pending",
          );

          setMessage(
            "The payment has not been confirmed yet. "
            + "You can retry this check safely without creating another charge.",
          );
        } catch (
          reason
        ) {
          if (
            isTemporaryNetworkProblem(
              reason,
            )
          ) {
            setState(
              "pending",
            );

            setMessage(
              "The connection was interrupted while HomeLink was confirming "
              + "the payment. The transaction may still have completed. "
              + "Retry verification safely — do not start a new payment.",
            );

            return;
          }

          setState(
            "error",
          );

          setMessage(
            getApiErrorMessage(
              reason,
              "The payment could not be verified right now.",
            ),
          );
        }
      },
      [
        reference,
      ],
    );

  useEffect(() => {
    // One automatic attempt.
    // paymentService also deduplicates the request,
    // which protects against React development remounts.
    void verify();
  }, [
    verify,
  ]);

  const icon =
    state ===
      "success" ? (
      <CheckCircle2
        aria-hidden="true"
      />
    ) :
    state ===
      "error" ? (
      <AlertCircle
        aria-hidden="true"
      />
    ) :
    state ===
      "checking" ? (
      <Loader2
        className={
          styles.spinner
        }
        aria-hidden="true"
      />
    ) : (
      <CreditCard
        aria-hidden="true"
      />
    );

  const tone =
    state === "success"
      ? "success"
      : state === "error"
        ? "danger"
        : "info";

  return (
    <div
      className={
        styles.wrap
      }
    >
      <section
        className={
          styles.card
        }
      >
        <span
          className={
            styles.icon
          }
          data-tone={
            tone
          }
        >
          {icon}
        </span>

        <span
          className={
            styles.eyebrow
          }
        >
          Payment verification
        </span>

        <h1>
          {state ===
          "checking"
            ? "Confirming your payment."
            : state ===
                "success"
              ? "Payment confirmed."
              : state ===
                  "pending"
                ? "Confirmation is still pending."
                : "Verification needs attention."}
        </h1>

        <p>
          {state ===
          "checking"
            ? "HomeLink is securely confirming this existing transaction with the payment provider."
            : state ===
                "success"
              ? `${payment?.plan.credit_quantity ?? 0} posting ${
                  payment?.plan.credit_quantity === 1
                    ? "credit has"
                    : "credits have"
                } been added to your account.`
              : message}
        </p>

        <div
          className={
            styles.reference
          }
        >
          <span>
            Reference
          </span>

          <strong>
            {reference ||
              "Missing reference"}
          </strong>
        </div>

        {payment ? (
          <div
            className={
              styles.reference
            }
          >
            <span>
              Amount
            </span>

            <strong>
              {formatCurrency(
                payment.amount_kobo /
                  100,
                payment.currency,
              )}
            </strong>
          </div>
        ) : null}

        <div
          className={
            styles.actions
          }
        >
          <Link
            href="/dashboard/credits"
            className={
              styles.primary
            }
          >
            View credits
          </Link>

          {state !==
          "success" ? (
            <button
              type="button"
              className={
                styles.secondary
              }
              onClick={() =>
                void verify()
              }
              disabled={
                state ===
                "checking"
              }
            >
              <RefreshCw
                aria-hidden="true"
              />

              Retry verification
            </button>
          ) : (
            <Link
              href="/dashboard"
              className={
                styles.secondary
              }
            >
              Return to dashboard
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}