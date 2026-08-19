"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LockKeyhole, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { getApiErrorMessage } from "@/lib/api-errors";
import { authService } from "@/services/auth-service";

import styles from "@/components/auth/AuthForm.module.css";

const schema = z
  .object({
    password: z
      .string()
      .min(10, "Use at least 10 characters.")
      .regex(/[a-z]/, "Add a lowercase letter.")
      .regex(/[A-Z]/, "Add an uppercase letter.")
      .regex(/[0-9]/, "Add a number."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [complete, setComplete] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const submit = handleSubmit(async ({ password }) => {
    if (!token) {
      toast.error("This reset link is missing its token.");
      return;
    }

    try {
      await authService.resetPassword(token, password);
      setComplete(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Password reset failed."));
    }
  });

  return (
    <>
      <header className={styles.header}>
        <h1>Choose a new password</h1>
        <p>Your new password will sign out all existing HomeLink sessions.</p>
      </header>

      {complete ? (
        <div className={styles.successCard}>
          <strong>Password updated</strong>
          You can now <Link href="/login">sign in</Link> with your new password.
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.field}>
            <label htmlFor="password">New password</label>
            <div className={styles.inputWrap}>
              <LockKeyhole aria-hidden="true" />
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className={styles.input}
                {...register("password")}
              />
            </div>
            {errors.password ? (
              <p className={styles.error}>{errors.password.message}</p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm new password</label>
            <div className={styles.inputWrap}>
              <LockKeyhole aria-hidden="true" />
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={styles.input}
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword ? (
              <p className={styles.error}>{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || !token}
          >
            {isSubmitting ? (
              <Loader2 className={styles.spinner} aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {isSubmitting ? "Updating…" : "Update password"}
          </button>

          {!token ? (
            <p className={styles.error}>This reset link is incomplete.</p>
          ) : null}
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p>Preparing password reset…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}