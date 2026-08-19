"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { toast } from "sonner";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  formatCurrency,
  titleCase,
} from "@/lib/formatters";

import {
  paymentService,
} from "@/services/payment-service";

import type {
  CreditBalance,
  PaymentPlan,
} from "@/types/payment";

import styles from "./page.module.css";


export default function CreditsPage() {
  const [
    credits,
    setCredits,
  ] =
    useState<CreditBalance[]>([]);

  const [
    plans,
    setPlans,
  ] =
    useState<PaymentPlan[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    buyingCode,
    setBuyingCode,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState("");


  /* =========================================================
     LOAD BALANCES + PLANS
  ========================================================= */

  useEffect(() => {
    let active = true;

    Promise.all([
      paymentService.listCredits(),
      paymentService.listPlans(),
    ])
      .then(
        ([
          creditItems,
          planItems,
        ]) => {
          if (!active) {
            return;
          }

          setCredits(
            creditItems,
          );

          setPlans(
            planItems,
          );

          setError("");
        },
      )
      .catch(
        (
          reason,
        ) => {
          if (!active) {
            return;
          }

          setError(
            getApiErrorMessage(
              reason,
              "Credits and payment plans could not be loaded.",
            ),
          );
        },
      )
      .finally(() => {
        if (active) {
          setLoading(
            false,
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);


  /* =========================================================
     START CHECKOUT
  ========================================================= */

  const buy =
    async (
      plan: PaymentPlan,
    ) => {
      if (buyingCode) {
        return;
      }

      setBuyingCode(
        plan.code,
      );

      try {
        const result =
          await paymentService.initialize(
            plan.code,
          );

        const url =
          new URL(
            result.authorization_url,
            window.location.origin,
          );

        if (
          url.origin ===
          window.location.origin
        ) {
          window.location.assign(
            `${url.pathname}${url.search}`,
          );

          return;
        }

        window.location.assign(
          result.authorization_url,
        );
      } catch (
        reason
      ) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Checkout could not be started.",
          ),
        );

        setBuyingCode(
          null,
        );
      }
    };


  return (
    <div
      className={
        styles.page
      }
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header
        className={
          styles.header
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            <CreditCard
              aria-hidden="true"
            />

            Posting access
          </span>

          <h1>
            Credits and
            payments.
          </h1>

          <p>
            Keep track of your
            posting allowance and
            add more credits when
            you need them.
          </p>
        </div>
      </header>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {error ? (
        <div
          className={
            styles.error
          }
          role="alert"
        >
          <strong>
            Something went wrong.
          </strong>

          <span>
            {error}
          </span>
        </div>
      ) : null}


      {/* =====================================================
          BALANCES
      ====================================================== */}

      <section
        className={
          styles.balanceSection
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              Current balance
            </span>

            <h2>
              Your posting
              credits.
            </h2>
          </div>

          <p>
            Free credits are used
            before purchased
            credits when you
            submit a listing.
          </p>
        </div>


        {loading ? (
          <div
            className={
              styles.creditGrid
            }
          >
            {Array.from(
              {
                length: 3,
              },
              (
                _,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className={
                    styles.creditSkeleton
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div
            className={
              styles.creditGrid
            }
          >
            {credits.map(
              (
                credit,
              ) => {
                const total =
                  credit.free_remaining +
                  credit.paid_remaining;

                return (
                  <article
                    key={
                      credit.credit_type
                    }
                    className={
                      styles.creditCard
                    }
                  >
                    <div
                      className={
                        styles.creditTop
                      }
                    >
                      <span>
                        {titleCase(
                          credit.credit_type,
                        )}
                      </span>

                      <CheckCircle2
                        aria-hidden="true"
                      />
                    </div>

                    <strong>
                      {total}
                    </strong>

                    <span
                      className={
                        styles.creditLabel
                      }
                    >
                      {total === 1
                        ? "credit available"
                        : "credits available"}
                    </span>

                    <div
                      className={
                        styles.creditBreakdown
                      }
                    >
                      <div>
                        <span>
                          Free
                        </span>

                        <strong>
                          {
                            credit.free_remaining
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Purchased
                        </span>

                        <strong>
                          {
                            credit.paid_remaining
                          }
                        </strong>
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>


      {/* =====================================================
          PACKAGES
      ====================================================== */}

      <section
        className={
          styles.packageSection
        }
      >
        <div
          className={
            styles.packageIntro
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              <ShieldCheck
                aria-hidden="true"
              />

              Available packages
            </span>

            <h2>
              Buy additional
              credits.
            </h2>

            <p>
              Choose a package for
              the type of listing
              you want to post.
              Credits are added
              only after a
              successful payment
              is confirmed.
            </p>
          </div>


          <div
            className={
              styles.paymentNote
            }
          >
            <ShieldCheck
              aria-hidden="true"
            />

            <div>
              <strong>
                Secure
                confirmation
              </strong>

              <span>
                HomeLink verifies
                a completed
                payment before
                adding purchased
                credits.
              </span>
            </div>
          </div>
        </div>


        {loading ? (
          <div
            className={
              styles.planGrid
            }
          >
            {Array.from(
              {
                length: 3,
              },
              (
                _,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className={
                    styles.planSkeleton
                  }
                />
              ),
            )}
          </div>
        ) : plans.length ? (
          <div
            className={
              styles.planGrid
            }
          >
            {plans.map(
              (
                plan,
              ) => {
                const selected =
                  buyingCode ===
                  plan.code;

                return (
                  <article
                    key={
                      plan.id
                    }
                    className={
                      styles.planCard
                    }
                  >
                    <div
                      className={
                        styles.planTop
                      }
                    >
                      <span>
                        {titleCase(
                          plan.credit_type,
                        )}
                      </span>

                      <span
                        className={
                          styles.quantity
                        }
                      >
                        {
                          plan.credit_quantity
                        }{" "}
                        {plan.credit_quantity ===
                        1
                          ? "credit"
                          : "credits"}
                      </span>
                    </div>


                    <h3>
                      {plan.name}
                    </h3>


                    <p>
                      {
                        plan.description
                      }
                    </p>


                    <div
                      className={
                        styles.planPrice
                      }
                    >
                      <span>
                        Package
                        price
                      </span>

                      <strong>
                        {formatCurrency(
                          plan.amount_kobo /
                            100,
                          plan.currency,
                        )}
                      </strong>
                    </div>


                    <button
                      type="button"
                      disabled={
                        buyingCode !==
                        null
                      }
                      onClick={() =>
                        void buy(
                          plan,
                        )
                      }
                    >
                      {selected ? (
                        <>
                          <Loader2
                            className={
                              styles.spinner
                            }
                            aria-hidden="true"
                          />

                          Preparing
                          checkout…
                        </>
                      ) : (
                        <>
                          Choose
                          package

                          <ArrowRight
                            aria-hidden="true"
                          />
                        </>
                      )}
                    </button>
                  </article>
                );
              },
            )}
          </div>
        ) : (
          <div
            className={
              styles.emptyPlans
            }
          >
            <strong>
              No packages
              available.
            </strong>

            <span>
              Payment plans have
              not been made
              available yet.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}