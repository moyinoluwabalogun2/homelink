"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { getApiErrorMessage } from "@/lib/api-errors";
import { formatCurrency } from "@/lib/formatters";
import { paymentService } from "@/services/payment-service";
import type { Payment } from "@/types/payment";

import styles from "./PaymentCallbackClient.module.css";

type CallbackState = "checking" | "success" | "pending" | "error";

export default function PaymentCallbackClient() {
  const searchParams = useSearchParams();
  const reference =
    searchParams.get("reference") ?? searchParams.get("trxref") ?? "";

  const [state, setState] = useState<CallbackState>("checking");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");

  const verify = useCallback(async () => {
    if (!reference) {
      setState("error");
      setError("The payment reference is missing from this callback URL.");
      return;
    }

    setState("checking");
    setError("");

    try {
      const verified = await paymentService.verify(reference);
      setPayment(verified);

      if (verified.status === "success") {
        setState("success");
      } else {
        setState("pending");
      }
    } catch (reason) {
      setState("error");
      setError(
        getApiErrorMessage(
          reason,
          "The payment could not be verified right now.",
        ),
      );
    }
  }, [reference]);

  useEffect(() => {
    void verify();
  }, [verify]);

  const icon =
    state === "success" ? (
      <CheckCircle2 aria-hidden="true" />
    ) : state === "error" ? (
      <AlertCircle aria-hidden="true" />
    ) : state === "checking" ? (
      <Loader2 className={styles.spinner} aria-hidden="true" />
    ) : (
      <CreditCard aria-hidden="true" />
    );

  const tone =
    state === "success" ? "success" : state === "error" ? "danger" : "info";

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <span className={styles.icon} data-tone={tone}>
          {icon}
        </span>

        <span className={styles.eyebrow}>Payment verification</span>

        <h1>
          {state === "checking"
            ? "Confirming your payment."
            : state === "success"
              ? "Payment confirmed."
              : state === "pending"
                ? "Payment is still pending."
                : "Verification needs attention."}
        </h1>

        <p>
          {state === "checking"
            ? "HomeLink is checking the transaction securely with the payment provider."
            : state === "success"
              ? `${payment?.plan.credit_quantity ?? 0} posting credits have ` +
                "been added to your account."
              : state === "pending"
                ? "The provider has not marked this transaction as successful " +
                  "yet. You can retry verification safely."
                : error}
        </p>

        <div className={styles.reference}>
          <span>Reference</span>
          <strong>{reference || "Missing reference"}</strong>
        </div>

        {payment ? (
          <div className={styles.reference}>
            <span>Amount</span>
            <strong>
              {formatCurrency(payment.amount_kobo / 100, payment.currency)}
            </strong>
          </div>
        ) : null}

        <div className={styles.actions}>
          <Link href="/dashboard/credits" className={styles.primary}>
            View credits
          </Link>

          {state !== "success" ? (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => void verify()}
              disabled={state === "checking"}
            >
              <RefreshCw aria-hidden="true" />
              Retry verification
            </button>
          ) : (
            <Link href="/dashboard" className={styles.secondary}>
              Return to dashboard
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}