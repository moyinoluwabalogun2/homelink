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
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  UserRoundPlus,
} from "lucide-react";

import {
  useForm,
} from "react-hook-form";

import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api-errors";

import styles from "@/components/auth/AuthForm.module.css";

const passwordSchema =
  z
    .string()
    .min(
      10,
      "Use at least 10 characters.",
    )
    .regex(
      /[a-z]/,
      "Add a lowercase letter.",
    )
    .regex(
      /[A-Z]/,
      "Add an uppercase letter.",
    )
    .regex(
      /[0-9]/,
      "Add a number.",
    );

const registerSchema =
  z
    .object({
      fullName:
        z
          .string()
          .trim()
          .min(
            2,
            "Enter your full name.",
          )
          .max(
            150,
            "Your name is too long.",
          ),

      email:
        z
          .string()
          .trim()
          .email(
            "Enter a valid email address.",
          ),

      phone:
        z
          .string()
          .trim()
          .regex(
            /^\+?[0-9\s()-]{10,20}$/,
            "Enter a valid phone number.",
          ),

      password:
        passwordSchema,

      confirmPassword:
        z
          .string()
          .min(
            1,
            "Confirm your password.",
          ),

      acceptTerms:
        z
          .boolean()
          .refine(
            Boolean,
            {
              message:
                "Accept the Terms of Service.",
            },
          ),

      acknowledgePrivacy:
        z
          .boolean()
          .refine(
            Boolean,
            {
              message:
                "Acknowledge the Privacy Notice.",
            },
          ),

      marketingConsent:
        z.boolean(),
    })
    .refine(
      (values) =>
        values.password ===
        values.confirmPassword,
      {
        path: [
          "confirmPassword",
        ],
        message:
          "Passwords do not match.",
      },
    );

type RegisterForm =
  z.infer<
    typeof registerSchema
  >;

export default function RegisterPage() {
  const router = useRouter();

  const {
    register:
      createAccount,
    status,
  } = useAuth();

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmation,
    setShowConfirmation,
  ] = useState(false);

  const {
    register,
    handleSubmit,
    watch,

    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<RegisterForm>({
    resolver:
      zodResolver(
        registerSchema,
      ),

    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      acknowledgePrivacy:
        false,
      marketingConsent:
        false,
    },
  });

  const password =
    watch("password") ?? "";

  const passwordRequirements = [
    {
      label:
        "At least 10 characters",
      passed:
        password.length >= 10,
    },
    {
      label:
        "One uppercase letter",
      passed:
        /[A-Z]/.test(
          password,
        ),
    },
    {
      label:
        "One lowercase letter",
      passed:
        /[a-z]/.test(
          password,
        ),
    },
    {
      label:
        "At least one number",
      passed:
        /[0-9]/.test(
          password,
        ),
    },
  ];

  useEffect(() => {
    if (
      status ===
      "authenticated"
    ) {
      router.replace(
        "/dashboard",
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
            await createAccount({
              full_name:
                values.fullName.trim(),
              email:
                values.email
                  .trim()
                  .toLowerCase(),
              phone:
                values.phone.trim(),
              password:
                values.password,
              accept_terms:
                true,
              acknowledge_privacy:
                true,
              marketing_consent:
                values.marketingConsent,
            });

          toast.success(
            `Welcome to HomeLink, ${
              user.full_name
                .split(" ")[0]
            }.`,
          );

          router.replace(
            "/dashboard",
          );
        } catch (error) {
          toast.error(
            getApiErrorMessage(
              error,
              "Registration failed.",
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
          sizes="(max-width: 900px) 0vw, 45vw"
          className={styles.visualImage}
        />

        <div
          className={styles.visualOverlay}
          aria-hidden="true"
        />

        <div className={styles.visualContent}>
          <span className={styles.visualEyebrow}>
            Join HomeLink
          </span>

          <h2>
            One account for
            living around OOU.
          </h2>

          <p>
            Save places, contact professionals,
            explore marketplace items and manage
            your own listings.
          </p>

          <div className={styles.visualTrust}>
            <ShieldCheck aria-hidden="true" />

            <span>
              Built around clearer listings
              and safer decisions.
            </span>
          </div>
        </div>
      </section>

      <section
        className={`${styles.panel} ${styles.registerPanel}`}
      >
        <div
          className={`${styles.panelInner} ${styles.registerInner}`}
        >
          <div className={styles.panelTop}>
            <span>
              Create account
            </span>

            <Link href="/">
              Back home
            </Link>
          </div>

          <header className={styles.header}>
            <span className={styles.formEyebrow}>
              Get started
            </span>

            <h1>
              Create your
              HomeLink account.
            </h1>

            <p>
              Save listings, contact publishers and
              manage posts from one place.
            </p>
          </header>

          <form
            className={styles.form}
            onSubmit={submit}
            noValidate
          >
            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <label htmlFor="fullName">
                  Full name
                </label>

                <div className={styles.inputWrap}>
                  <UserRound aria-hidden="true" />

                  <input
                    id="fullName"
                    autoComplete="name"
                    placeholder="Your full name"
                    className={styles.input}
                    aria-invalid={
                      errors.fullName
                        ? true
                        : undefined
                    }
                    aria-describedby={
                      errors.fullName
                        ? "register-name-error"
                        : undefined
                    }
                    {...register(
                      "fullName",
                    )}
                  />
                </div>

                {errors.fullName ? (
                  <p
                    id="register-name-error"
                    className={styles.error}
                    role="alert"
                  >
                    {errors.fullName.message}
                  </p>
                ) : null}
              </div>

              <div className={styles.field}>
                <label htmlFor="phone">
                  Phone number
                </label>

                <div className={styles.inputWrap}>
                  <Phone aria-hidden="true" />

                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="08012345678"
                    className={styles.input}
                    aria-invalid={
                      errors.phone
                        ? true
                        : undefined
                    }
                    aria-describedby={
                      errors.phone
                        ? "register-phone-error"
                        : undefined
                    }
                    {...register(
                      "phone",
                    )}
                  />
                </div>

                {errors.phone ? (
                  <p
                    id="register-phone-error"
                    className={styles.error}
                    role="alert"
                  >
                    {errors.phone.message}
                  </p>
                ) : null}
              </div>
            </div>

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
                      ? "register-email-error"
                      : undefined
                  }
                  {...register(
                    "email",
                  )}
                />
              </div>

              {errors.email ? (
                <p
                  id="register-email-error"
                  className={styles.error}
                  role="alert"
                >
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <label htmlFor="password">
                  Password
                </label>

                <div className={styles.inputWrap}>
                  <LockKeyhole aria-hidden="true" />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    placeholder="At least 10 characters"
                    className={styles.passwordInput}
                    aria-invalid={
                      errors.password
                        ? true
                        : undefined
                    }
                    aria-describedby={
                      errors.password
                        ? "register-password-error register-password-requirements"
                        : "register-password-requirements"
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
                    id="register-password-error"
                    className={styles.error}
                    role="alert"
                  >
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmPassword">
                  Confirm password
                </label>

                <div className={styles.inputWrap}>
                  <LockKeyhole aria-hidden="true" />

                  <input
                    id="confirmPassword"
                    type={
                      showConfirmation
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    className={styles.passwordInput}
                    aria-invalid={
                      errors.confirmPassword
                        ? true
                        : undefined
                    }
                    aria-describedby={
                      errors.confirmPassword
                        ? "register-confirm-error"
                        : undefined
                    }
                    {...register(
                      "confirmPassword",
                    )}
                  />

                  <button
                    type="button"
                    className={styles.passwordButton}
                    onClick={() =>
                      setShowConfirmation(
                        (current) =>
                          !current,
                      )
                    }
                    aria-label={
                      showConfirmation
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                    aria-pressed={showConfirmation}
                  >
                    {showConfirmation ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </button>
                </div>

                {errors.confirmPassword ? (
                  <p
                    id="register-confirm-error"
                    className={styles.error}
                    role="alert"
                  >
                    {errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              id="register-password-requirements"
              className={styles.passwordRequirements}
            >
              <strong>
                Password requirements
              </strong>

              <div>
                {passwordRequirements.map(
                  (requirement) => (
                    <span
                      key={requirement.label}
                      className={
                        requirement.passed
                          ? styles.requirementPassed
                          : undefined
                      }
                    >
                      <Check aria-hidden="true" />
                      {requirement.label}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className={styles.legalGroup}>
              <div className={styles.checkboxRow}>
                <input
                  id="acceptTerms"
                  type="checkbox"
                  aria-invalid={
                    errors.acceptTerms
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    errors.acceptTerms
                      ? "register-terms-error"
                      : undefined
                  }
                  {...register(
                    "acceptTerms",
                  )}
                />

                <label htmlFor="acceptTerms">
                  I accept the{" "}

                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </Link>
                  .
                </label>
              </div>

              {errors.acceptTerms ? (
                <p
                  id="register-terms-error"
                  className={styles.error}
                  role="alert"
                >
                  {errors.acceptTerms.message}
                </p>
              ) : null}

              <div className={styles.checkboxRow}>
                <input
                  id="acknowledgePrivacy"
                  type="checkbox"
                  aria-invalid={
                    errors.acknowledgePrivacy
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    errors.acknowledgePrivacy
                      ? "register-privacy-error"
                      : undefined
                  }
                  {...register(
                    "acknowledgePrivacy",
                  )}
                />

                <label htmlFor="acknowledgePrivacy">
                  I have read the{" "}

                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Notice
                  </Link>
                  .
                </label>
              </div>

              {errors.acknowledgePrivacy ? (
                <p
                  id="register-privacy-error"
                  className={styles.error}
                  role="alert"
                >
                  {
                    errors
                      .acknowledgePrivacy
                      .message
                  }
                </p>
              ) : null}

              <div className={styles.checkboxRow}>
                <input
                  id="marketingConsent"
                  type="checkbox"
                  {...register(
                    "marketingConsent",
                  )}
                />

                <label htmlFor="marketingConsent">
                  Send me optional HomeLink updates.
                  I can withdraw this later.
                </label>
              </div>
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
                <UserRoundPlus aria-hidden="true" />
              )}

              {isSubmitting
                ? "Creating account…"
                : "Create account"}
            </button>
          </form>

          <p className={styles.footerText}>
            Already registered?{" "}

            <Link
              href="/login"
              className={styles.footerLink}
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}