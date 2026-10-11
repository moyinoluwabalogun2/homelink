"use client";

import {
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  zodResolver,
} from "@hookform/resolvers/zod";

import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  useForm,
} from "react-hook-form";

import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api-errors";

import styles from "@/components/auth/AuthForm.module.css";

const loginSchema =
  z.object({
    email:
      z
        .string()
        .trim()
        .email(
          "Enter a valid email address.",
        ),

    password:
      z
        .string()
        .min(
          1,
          "Enter your password.",
        ),
  });

type LoginForm =
  z.infer<
    typeof loginSchema
  >;

function safeReturnPath(): string {
  if (
    typeof window ===
    "undefined"
  ) {
    return "/dashboard";
  }

  const requestedPath =
    new URLSearchParams(
      window.location.search,
    ).get("next");

  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.includes("\\") ||
    requestedPath.includes(
      "\n",
    ) ||
    requestedPath.includes(
      "\r",
    )
  ) {
    return "/dashboard";
  }

  return requestedPath;
}

export default function LoginPage() {
  const router = useRouter();

  const {
    login,
    status,
  } = useAuth();

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const {
    register,
    handleSubmit,

    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<LoginForm>({
    resolver:
      zodResolver(
        loginSchema,
      ),

    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (
      status ===
      "authenticated"
    ) {
      router.replace(
        safeReturnPath(),
      );
    }
  }, [
    status,
    router,
  ]);

  const submit =
    handleSubmit(
      async (values) => {
        try {
          const user =
            await login({
              email:
                values.email.trim(),
              password:
                values.password,
            });

          toast.success(
            `Welcome back, ${
              user.full_name
                .split(" ")[0]
            }.`,
          );

          router.replace(
            safeReturnPath(),
          );
        } catch (error) {
          toast.error(
            getApiErrorMessage(
              error,
              "Sign-in failed.",
            ),
          );
        }
      },
    );

  return (
    <main className={styles.authPage}>
      <section className={styles.visual}>
        <Image
          src="/images/home/hero-home.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 0vw, 48vw"
          className={styles.visualImage}
        />

        <div
          className={styles.visualOverlay}
          aria-hidden="true"
        />

        <div className={styles.visualContent}>
          <span className={styles.visualEyebrow}>
            HomeLink · OOU
          </span>

          <h2>
            Your place,
            your listings,
            your conversations.
          </h2>

          <p>
            Sign in and continue
            from where you left off.
          </p>

          <div className={styles.visualTrust}>
            <ShieldCheck aria-hidden="true" />

            <span>
              Browse, save and contact
              with more context.
            </span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelInner}>
          <div className={styles.panelTop}>
            <span>
              Member access
            </span>

            <Link href="/">
              Back home
            </Link>
          </div>

          <header className={styles.header}>
            <span className={styles.formEyebrow}>
              Welcome back
            </span>

            <h1>
              Sign in to
              HomeLink.
            </h1>

            <p>
              Continue managing saved listings,
              inquiries and your HomeLink activity.
            </p>
          </header>

          <form
            className={styles.form}
            onSubmit={submit}
            noValidate
          >
            <div className={styles.field}>
              <label htmlFor="email">
                Email address
              </label>

              <div className={styles.inputWrap}>
                <Mail aria-hidden="true" />

                <input
                  id="email"
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
                      ? "login-email-error"
                      : undefined
                  }
                  {...register(
                    "email",
                  )}
                />
              </div>

              {errors.email ? (
                <p
                  id="login-email-error"
                  className={styles.error}
                  role="alert"
                >
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="password">
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className={styles.textLink}
                >
                  Forgot password?
                </Link>
              </div>

              <div className={styles.inputWrap}>
                <LockKeyhole aria-hidden="true" />

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={styles.passwordInput}
                  aria-invalid={
                    errors.password
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    errors.password
                      ? "login-password-error"
                      : undefined
                  }
                  {...register(
                    "password",
                  )}
                />

                <button
                  type="button"
                  className={styles.passwordButton}
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current,
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              </div>

              {errors.password ? (
                <p
                  id="login-password-error"
                  className={styles.error}
                  role="alert"
                >
                  {errors.password.message}
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
                <LogIn aria-hidden="true" />
              )}

              {isSubmitting
                ? "Signing in…"
                : "Sign in"}
            </button>
          </form>

          <p className={styles.footerText}>
            New to HomeLink?{" "}

            <Link
              href="/register"
              className={styles.footerLink}
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}