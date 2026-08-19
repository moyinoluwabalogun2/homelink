"use client";

import {
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  zodResolver,
} from "@hookform/resolvers/zod";

import {
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

import {
  toast,
} from "sonner";

import {
  z,
} from "zod";

import {
  useAuth,
} from "@/context/AuthContext";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

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
          ),

      email:
        z
          .string()
          .email(
            "Enter a valid email address.",
          ),

      phone:
        z
          .string()
          .regex(
            /^\+?[0-9\s()-]{10,20}$/,
            "Enter a valid phone number.",
          ),

      password:
        passwordSchema,

      confirmPassword:
        z.string(),

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
  const router =
    useRouter();

  const {
    register:
      createAccount,

    status,
  } = useAuth();


  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);


  const {
    register,
    handleSubmit,

    formState: {
      errors,
      isSubmitting,
    },
  } =
    useForm<RegisterForm>({
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
      async (
        values,
      ) => {
        try {
          const user =
            await createAccount(
              {
                full_name:
                  values.fullName,

                email:
                  values.email,

                phone:
                  values.phone,

                password:
                  values.password,

                accept_terms:
                  true,

                acknowledge_privacy:
                  true,

                marketing_consent:
                  values.marketingConsent,
              },
            );

          toast.success(
            `Your HomeLink account is ready, ${
              user.full_name.split(
                " ",
              )[0]
            }.`,
          );

          router.replace(
            "/dashboard",
          );
        } catch (
          error
        ) {
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
    <main
      className={
        styles.authPage
      }
    >
      {/* ===================================================
          IMAGE SIDE
      ==================================================== */}

      <section
        className={
          styles.visual
        }
      >
        <Image
          src="/images/home/hero-home.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 0vw, 45vw"
          className={
            styles.visualImage
          }
        />

        <div
          className={
            styles.visualOverlay
          }
        />


        <div
          className={
            styles.visualContent
          }
        >
          <span
            className={
              styles.visualEyebrow
            }
          >
            Join HomeLink
          </span>

          <h2>
            One account for
            living around OOU.
          </h2>

          <p>
            Save places, contact
            professionals, explore
            marketplace items and
            manage your own
            listings.
          </p>


          <div
            className={
              styles.visualTrust
            }
          >
            <ShieldCheck
              aria-hidden="true"
            />

            <span>
              Built around clearer
              listings and safer
              decisions.
            </span>
          </div>
        </div>
      </section>


      {/* ===================================================
          REGISTER PANEL
      ==================================================== */}

      <section
        className={[
          styles.panel,
          styles.registerPanel,
        ].join(" ")}
      >
        <div
          className={[
            styles.panelInner,
            styles.registerInner,
          ].join(" ")}
        >
          <div
            className={
              styles.panelTop
            }
          >
            <span>
              Create account
            </span>

            <Link href="/">
              Back home
            </Link>
          </div>


          <header
            className={
              styles.header
            }
          >
            <span
              className={
                styles.formEyebrow
              }
            >
              Get started
            </span>

            <h1>
              Create your
              HomeLink account.
            </h1>

            <p>
              Save listings,
              contact agents and
              manage posts from one
              place.
            </p>
          </header>


          <form
            className={
              styles.form
            }
            onSubmit={
              submit
            }
            noValidate
          >
            <div
              className={
                styles.twoColumns
              }
            >
              <div
                className={
                  styles.field
                }
              >
                <label
                  htmlFor="fullName"
                >
                  Full name
                </label>

                <div
                  className={
                    styles.inputWrap
                  }
                >
                  <UserRound
                    aria-hidden="true"
                  />

                  <input
                    id="fullName"
                    autoComplete="name"
                    placeholder="Your full name"
                    className={
                      styles.input
                    }
                    {...register(
                      "fullName",
                    )}
                  />
                </div>

                {errors.fullName ? (
                  <p
                    className={
                      styles.error
                    }
                  >
                    {
                      errors
                        .fullName
                        .message
                    }
                  </p>
                ) : null}
              </div>


              <div
                className={
                  styles.field
                }
              >
                <label
                  htmlFor="phone"
                >
                  Phone number
                </label>

                <div
                  className={
                    styles.inputWrap
                  }
                >
                  <Phone
                    aria-hidden="true"
                  />

                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="08012345678"
                    className={
                      styles.input
                    }
                    {...register(
                      "phone",
                    )}
                  />
                </div>

                {errors.phone ? (
                  <p
                    className={
                      styles.error
                    }
                  >
                    {
                      errors.phone
                        .message
                    }
                  </p>
                ) : null}
              </div>
            </div>


            <div
              className={
                styles.field
              }
            >
              <label
                htmlFor="email"
              >
                Email address
              </label>

              <div
                className={
                  styles.inputWrap
                }
              >
                <Mail
                  aria-hidden="true"
                />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={
                    styles.input
                  }
                  {...register(
                    "email",
                  )}
                />
              </div>

              {errors.email ? (
                <p
                  className={
                    styles.error
                  }
                >
                  {
                    errors.email
                      .message
                  }
                </p>
              ) : null}
            </div>


            <div
              className={
                styles.twoColumns
              }
            >
              <div
                className={
                  styles.field
                }
              >
                <label
                  htmlFor="password"
                >
                  Password
                </label>

                <div
                  className={
                    styles.inputWrap
                  }
                >
                  <LockKeyhole
                    aria-hidden="true"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    placeholder="At least 10 characters"
                    className={
                      styles.passwordInput
                    }
                    {...register(
                      "password",
                    )}
                  />

                  <button
                    type="button"
                    className={
                      styles.passwordButton
                    }
                    onClick={() =>
                      setShowPassword(
                        (
                          current,
                        ) =>
                          !current,
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        aria-hidden="true"
                      />
                    ) : (
                      <Eye
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>

                {errors.password ? (
                  <p
                    className={
                      styles.error
                    }
                  >
                    {
                      errors
                        .password
                        .message
                    }
                  </p>
                ) : null}
              </div>


              <div
                className={
                  styles.field
                }
              >
                <label
                  htmlFor="confirmPassword"
                >
                  Confirm password
                </label>

                <div
                  className={
                    styles.inputWrap
                  }
                >
                  <LockKeyhole
                    aria-hidden="true"
                  />

                  <input
                    id="confirmPassword"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    className={
                      styles.passwordInput
                    }
                    {...register(
                      "confirmPassword",
                    )}
                  />
                </div>

                {errors.confirmPassword ? (
                  <p
                    className={
                      styles.error
                    }
                  >
                    {
                      errors
                        .confirmPassword
                        .message
                    }
                  </p>
                ) : null}
              </div>
            </div>


            <div
              className={
                styles.legalGroup
              }
            >
              <div
                className={
                  styles.checkboxRow
                }
              >
                <input
                  id="acceptTerms"
                  type="checkbox"
                  {...register(
                    "acceptTerms",
                  )}
                />

                <label
                  htmlFor="acceptTerms"
                >
                  I accept the{" "}

                  <a
                    href="http://localhost:8001/api/v1/legal/terms"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Terms of Service
                  </a>
                  .
                </label>
              </div>

              {errors.acceptTerms ? (
                <p
                  className={
                    styles.error
                  }
                >
                  {
                    errors
                      .acceptTerms
                      .message
                  }
                </p>
              ) : null}


              <div
                className={
                  styles.checkboxRow
                }
              >
                <input
                  id="acknowledgePrivacy"
                  type="checkbox"
                  {...register(
                    "acknowledgePrivacy",
                  )}
                />

                <label
                  htmlFor="acknowledgePrivacy"
                >
                  I have read the{" "}

                  <a
                    href="http://localhost:8001/api/v1/legal/privacy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Privacy Notice
                  </a>
                  .
                </label>
              </div>

              {errors.acknowledgePrivacy ? (
                <p
                  className={
                    styles.error
                  }
                >
                  {
                    errors
                      .acknowledgePrivacy
                      .message
                  }
                </p>
              ) : null}


              <div
                className={
                  styles.checkboxRow
                }
              >
                <input
                  id="marketingConsent"
                  type="checkbox"
                  {...register(
                    "marketingConsent",
                  )}
                />

                <label
                  htmlFor="marketingConsent"
                >
                  Send me optional
                  HomeLink updates.
                  I can withdraw
                  this later.
                </label>
              </div>
            </div>


            <button
              type="submit"
              className={
                styles.submitButton
              }
              disabled={
                isSubmitting
              }
            >
              {isSubmitting ? (
                <Loader2
                  className={
                    styles.spinner
                  }
                  aria-hidden="true"
                />
              ) : (
                <UserRoundPlus
                  aria-hidden="true"
                />
              )}

              {isSubmitting
                ? "Creating account…"
                : "Create account"}
            </button>
          </form>


          <p
            className={
              styles.footerText
            }
          >
            Already registered?{" "}

            <Link
              href="/login"
              className={
                styles.footerLink
              }
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}