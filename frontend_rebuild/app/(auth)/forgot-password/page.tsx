"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Mail, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { getApiErrorMessage } from "@/lib/api-errors";
import { authService } from "@/services/auth-service";

import styles from "@/components/auth/AuthForm.module.css";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const submit = handleSubmit(async ({ email }) => {
    try {
      const response = await authService.forgotPassword(email);
      setMessage(response.message);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  });

  return (
    <>
      <header className={styles.header}>
        <h1>Reset your password</h1>
        <p>Enter your account email and HomeLink will prepare a secure reset link.</p>
      </header>

      {message ? (
        <div className={styles.successCard}>
          <strong>Check your email</strong>
          {message}
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.field}>
            <label htmlFor="email">Email address</label>
            <div className={styles.inputWrap}>
              <Mail aria-hidden="true" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={styles.input}
                {...register("email")}
              />
            </div>
            {errors.email ? (
              <p className={styles.error}>{errors.email.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className={styles.spinner} aria-hidden="true" />
            ) : (
              <Send aria-hidden="true" />
            )}
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className={styles.footerText}>
        <Link href="/login" className={styles.footerLink}>
          <ArrowLeft aria-hidden="true" style={{ display: "inline", width: 14 }} />{" "}
          Return to sign in
        </Link>
      </p>
    </>
  );
}