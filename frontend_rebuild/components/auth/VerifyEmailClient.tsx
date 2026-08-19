"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MailCheck, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api-errors";
import { accountService } from "@/services/account-service";
import styles from "./VerifyEmailClient.module.css";

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your HomeLink email…");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("The verification token is missing.");
      return;
    }
    accountService.confirmEmailVerification(token)
      .then((result) => { setState("success"); setMessage(result.message); })
      .catch((reason) => { setState("error"); setMessage(getApiErrorMessage(reason, "The verification link is invalid or expired.")); });
  }, [token]);

  return (
    <section className={styles.card}>
      <span className={`${styles.icon} ${state === "error" ? styles.errorIcon : ""}`}>
        {state === "loading" ? <Loader2 aria-hidden="true" /> : state === "success" ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
      </span>
      <span className={styles.eyebrow}><MailCheck aria-hidden="true" />Email verification</span>
      <h1>{state === "loading" ? "One moment." : state === "success" ? "Email verified." : "Verification failed."}</h1>
      <p>{message}</p>
      {state !== "loading" ? <Link href={state === "success" ? "/dashboard/account" : "/login"}>{state === "success" ? "Return to account" : "Go to sign in"}</Link> : null}
    </section>
  );
}