"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api-errors";
import { formatCurrency } from "@/lib/formatters";
import { paymentService } from "@/services/payment-service";
import type { Payment } from "@/types/payment";
import shared from "@/components/dashboard/DashboardPage.module.css";
import styles from "./MockPaymentClient.module.css";

export default function MockPaymentClient() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? "";
  const [payment, setPayment] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const complete = async () => {
    if (!reference) return;
    setBusy(true);
    setError("");
    try { setPayment(await paymentService.completeMock(reference)); }
    catch (reason) { setError(getApiErrorMessage(reason, "Mock payment could not be completed.")); }
    finally { setBusy(false); }
  };

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <span className={styles.icon}>{payment ? <CheckCircle2 aria-hidden="true" /> : <CreditCard aria-hidden="true" />}</span>
        <span className={styles.eyebrow}>HomeLink development checkout</span>
        <h1>{payment ? "Payment completed." : "Complete mock payment."}</h1>
        <p>{payment ? `${payment.plan.credit_quantity} ${payment.plan.credit_type} credits have been added to your account.` : "This screen simulates a successful payment while Paystack is disabled. No real money is charged."}</p>
        <div className={styles.reference}><span>Reference</span><strong>{reference || "Missing reference"}</strong></div>
        {payment ? <div className={styles.reference}><span>Amount</span><strong>{formatCurrency(payment.amount_kobo / 100, payment.currency)}</strong></div> : null}
        {error ? <div className={shared.error}>{error}</div> : null}
        {payment ? <Link href="/dashboard/credits" className={shared.primaryButton}>Return to credits</Link> : <button type="button" className={shared.primaryButton} disabled={busy || !reference} onClick={() => void complete()}>{busy ? <><Loader2 aria-hidden="true" />Completing…</> : "Complete mock payment"}</button>}
      </section>
    </div>
  );
}