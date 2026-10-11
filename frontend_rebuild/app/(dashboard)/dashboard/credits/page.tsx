"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
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
  Payment,
  PaymentPlan,
  PaymentProvider,
} from "@/types/payment";

import styles from "./page.module.css";


const paymentDateFormatter =
  new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );


interface ProviderCopy {
  label: string;
  description: string;
}


const providerCopy: Partial<
  Record<
    PaymentProvider,
    ProviderCopy
  >
> = {
  mock: {
    label: "Test checkout",
    description:
      "Local development only. No real payment will be collected.",
  },

  paystack: {
    label: "Paystack",
    description:
      "Recommended for a quick Nigerian card or bank checkout.",
  },

  flutterwave: {
    label: "Flutterwave",
    description:
      "A secure alternative for card and supported bank payments.",
  },
};


function formatPaymentDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Date unavailable";
  }

  return paymentDateFormatter.format(
    date,
  );
}


function isSafeCheckoutUrl(
  value: string,
): boolean {
  try {
    const url =
      new URL(
        value,
        window.location.origin,
      );

    if (
      url.origin ===
      window.location.origin
    ) {
      return true;
    }

    return (
      url.protocol ===
      "https:"
    );
  } catch {
    return false;
  }
}


export default function CreditsPage() {
  const [
    credits,
    setCredits,
  ] = useState<
    CreditBalance[]
  >([]);

  const [
    plans,
    setPlans,
  ] = useState<
    PaymentPlan[]
  >([]);

  const [
    payments,
    setPayments,
  ] = useState<
    Payment[]
  >([]);

  const [
    providers,
    setProviders,
  ] = useState<
    PaymentProvider[]
  >([]);

  const [
    selectedProvider,
    setSelectedProvider,
  ] = useState<
    PaymentProvider | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(true);

  const [
    buyingCode,
    setBuyingCode,
  ] = useState<
    string | null
  >(null);

  const [
    checkingReference,
    setCheckingReference,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    providerError,
    setProviderError,
  ] = useState("");

  const [
    historyError,
    setHistoryError,
  ] = useState("");

  const mainRequestId =
    useRef(0);

  const historyRequestId =
    useRef(0);


  const visibleProviders =
    useMemo(
      () =>
        providers.filter(
          (
            provider,
          ): provider is PaymentProvider =>
            providerCopy[
              provider
            ] !== undefined,
        ),
      [
        providers,
      ],
    );


  const totalCredits =
    useMemo(
      () =>
        credits.reduce(
          (
            total,
            credit,
          ) =>
            total +
            credit.free_remaining +
            credit.paid_remaining,
          0,
        ),
      [
        credits,
      ],
    );


  const loadMainData =
    useCallback(
      async () => {
        const requestId =
          ++mainRequestId.current;

        setLoading(true);
        setError("");
        setProviderError("");

        const [
          creditResult,
          planResult,
          providerResult,
        ] =
          await Promise.allSettled(
            [
              paymentService
                .listCredits(),

              paymentService
                .listPlans(),

              paymentService
                .listProviders(),
            ],
          );

        if (
          requestId !==
          mainRequestId.current
        ) {
          return;
        }

        if (
          creditResult.status ===
          "fulfilled"
        ) {
          setCredits(
            creditResult.value,
          );
        }

        if (
          planResult.status ===
          "fulfilled"
        ) {
          setPlans(
            planResult.value,
          );
        }

        if (
          providerResult.status ===
          "fulfilled"
        ) {
          const availableProviders =
            providerResult.value
              .providers.filter(
                (
                  provider,
                ): provider is PaymentProvider =>
                  providerCopy[
                    provider
                  ] !== undefined,
              );

          const defaultProvider =
            providerResult.value
              .default_provider;

          setProviders(
            availableProviders,
          );

          setSelectedProvider(
            (
              currentProvider,
            ) => {
              if (
                currentProvider !==
                  null &&
                availableProviders
                  .includes(
                    currentProvider,
                  )
              ) {
                return currentProvider;
              }

              if (
                defaultProvider !==
                  null &&
                availableProviders
                  .includes(
                    defaultProvider,
                  )
              ) {
                return defaultProvider;
              }

              return (
                availableProviders[
                  0
                ] ?? null
              );
            },
          );
        } else {
          setProviders([]);
          setSelectedProvider(
            null,
          );

          setProviderError(
            getApiErrorMessage(
              providerResult.reason,
              "Payment gateways could not be loaded.",
            ),
          );
        }

        const coreFailures = [
          creditResult,
          planResult,
        ].filter(
          (result) =>
            result.status ===
            "rejected",
        );

        if (
          coreFailures.length >
          0
        ) {
          const firstFailure =
            coreFailures[
              0
            ] as PromiseRejectedResult;

          setError(
            getApiErrorMessage(
              firstFailure.reason,
              "Credits and payment packages could not be fully loaded.",
            ),
          );
        }

        setLoading(false);
      },
      [],
    );


  const loadHistory =
    useCallback(
      async (
        force = false,
      ) => {
        const requestId =
          ++historyRequestId.current;

        setHistoryLoading(
          true,
        );

        setHistoryError("");

        try {
          const paymentItems =
            await paymentService
              .listHistory({
                limit: 10,
                force,
              });

          if (
            requestId !==
            historyRequestId.current
          ) {
            return;
          }

          setPayments(
            paymentItems,
          );
        } catch (reason) {
          if (
            requestId ===
            historyRequestId.current
          ) {
            setHistoryError(
              getApiErrorMessage(
                reason,
                "Payment history could not be loaded.",
              ),
            );
          }
        } finally {
          if (
            requestId ===
            historyRequestId.current
          ) {
            setHistoryLoading(
              false,
            );
          }
        }
      },
      [],
    );


  useEffect(() => {
    void loadMainData();
    void loadHistory();

    return () => {
      mainRequestId.current +=
        1;

      historyRequestId.current +=
        1;
    };
  }, [
    loadHistory,
    loadMainData,
  ]);


  const buy =
    async (
      plan: PaymentPlan,
    ) => {
      if (
        buyingCode !== null ||
        checkingReference !==
          null ||
        selectedProvider ===
          null
      ) {
        return;
      }

      setBuyingCode(
        plan.code,
      );

      try {
        const result =
          await paymentService
            .initialize(
              plan.code,
              selectedProvider,
            );

        if (
          !isSafeCheckoutUrl(
            result.authorization_url,
          )
        ) {
          throw new Error(
            "The payment provider returned an invalid checkout address.",
          );
        }

        const checkoutUrl =
          new URL(
            result.authorization_url,
            window.location.origin,
          );

        if (
          checkoutUrl.origin ===
          window.location.origin
        ) {
          window.location.assign(
            `${checkoutUrl.pathname}${checkoutUrl.search}${checkoutUrl.hash}`,
          );

          return;
        }

        window.location.assign(
          checkoutUrl.toString(),
        );
      } catch (reason) {
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


  const checkPayment =
    async (
      payment: Payment,
    ) => {
      if (
        checkingReference !==
          null ||
        buyingCode !== null
      ) {
        return;
      }

      setCheckingReference(
        payment.reference,
      );

      try {
        const updated =
          await paymentService
            .verify(
              payment.reference,
            );

        setPayments(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                updated.id
                  ? updated
                  : item,
            ),
        );

        if (
          updated.status ===
          "success"
        ) {
          const refreshedCredits =
            await paymentService
              .listCredits({
                force: true,
              });

          setCredits(
            refreshedCredits,
          );

          toast.success(
            "Payment confirmed and credits updated.",
          );
        } else if (
          updated.status ===
          "abandoned"
        ) {
          toast.info(
            "This payment was abandoned. No credits were added.",
          );
        } else if (
          updated.status ===
          "failed"
        ) {
          toast.error(
            "This payment failed. No credits were added.",
          );
        } else if (
          updated.status ===
          "refunded"
        ) {
          toast.info(
            "This transaction has been reversed.",
          );
        } else {
          toast.info(
            "This payment is still pending.",
          );
        }

        setHistoryError("");
      } catch (reason) {
        toast.error(
          getApiErrorMessage(
            reason,
            "Payment status could not be checked.",
          ),
        );
      } finally {
        setCheckingReference(
          null,
        );
      }
    };


  return (
    <main
      className={
        styles.page
      }
    >
      <header
        className={
          styles.header
        }
      >
        <div
          className={
            styles.headerCopy
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            <WalletCards
              aria-hidden="true"
            />

            Posting access
          </span>

          <h1>
            Credits that keep
            your listings moving.
          </h1>

          <p>
            See your free and
            purchased allowance,
            choose the right
            listing package, and
            pay through a secure
            gateway.
          </p>
        </div>

        <div
          className={
            styles.headerAssurance
          }
        >
          <LockKeyhole
            aria-hidden="true"
          />

          <div>
            <strong>
              Secure checkout
            </strong>

            <span>
              Credits are released
              only after server
              verification.
            </span>
          </div>
        </div>
      </header>

      {error ? (
        <div
          className={
            styles.error
          }
          role="alert"
        >
          <div>
            <strong>
              Some information
              could not be loaded.
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void loadMainData()
            }
          >
            <RefreshCw
              aria-hidden="true"
              className={
                loading
                  ? styles.spinner
                  : undefined
              }
            />

            {loading
              ? "Trying again…"
              : "Try again"}
          </button>
        </div>
      ) : null}

      <section
        className={
          styles.balanceSection
        }
        aria-labelledby="balance-title"
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

            <h2
              id="balance-title"
            >
              Your posting
              credits.
            </h2>
          </div>

          <p>
            Your free allowance
            is always used first.
            Purchased credits
            remain available for
            the matching listing
            category.
          </p>
        </div>

        {!loading &&
        credits.length > 0 ? (
          <div
            className={
              styles.balanceSummary
            }
            aria-live="polite"
          >
            <span>
              Total available
            </span>

            <strong>
              {totalCredits}
            </strong>

            <span>
              {totalCredits === 1
                ? "posting credit"
                : "posting credits"}
            </span>
          </div>
        ) : null}

        {loading &&
        credits.length === 0 ? (
          <div
            className={
              styles.creditGrid
            }
            aria-busy="true"
            aria-label="Loading credit balances"
          >
            <span
              className={
                styles.srOnly
              }
            >
              Loading credit
              balances…
            </span>

            {Array.from(
              {
                length: 3,
              },
              (
                _,
                index,
              ) => (
                <div
                  key={index}
                  className={
                    styles
                      .creditSkeleton
                  }
                  aria-hidden="true"
                />
              ),
            )}
          </div>
        ) : credits.length >
          0 ? (
          <div
            className={
              styles.creditGrid
            }
          >
            {credits.map(
              (credit) => {
                const total =
                  credit
                    .free_remaining +
                  credit
                    .paid_remaining;

                return (
                  <article
                    key={
                      credit
                        .credit_type
                    }
                    className={
                      styles
                        .creditCard
                    }
                  >
                    <div
                      className={
                        styles
                          .creditTop
                      }
                    >
                      <span>
                        {titleCase(
                          credit
                            .credit_type,
                        )}
                      </span>

                      <CheckCircle2
                        aria-hidden="true"
                      />
                    </div>

                    <div
                      className={
                        styles
                          .creditTotal
                      }
                    >
                      <strong>
                        {total}
                      </strong>

                      <span>
                        {total === 1
                          ? "credit available"
                          : "credits available"}
                      </span>
                    </div>

                    <div
                      className={
                        styles
                          .creditBreakdown
                      }
                    >
                      <div>
                        <span>
                          Free
                        </span>

                        <strong>
                          {
                            credit
                              .free_remaining
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Purchased
                        </span>

                        <strong>
                          {
                            credit
                              .paid_remaining
                          }
                        </strong>
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        ) : (
          <div
            className={
              styles.emptyState
            }
          >
            <strong>
              No credit balances
              found.
            </strong>

            <span>
              Refresh the page or
              contact HomeLink
              support.
            </span>
          </div>
        )}
      </section>

      <section
        className={
          styles.packageSection
        }
        aria-labelledby="packages-title"
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
              <Sparkles
                aria-hidden="true"
              />

              Available packages
            </span>

            <h2
              id="packages-title"
            >
              Choose what you want
              to post.
            </h2>

            <p>
              Each package belongs
              to one listing
              category. Your
              credits are added
              automatically after
              payment confirmation.
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
                Verified before
                fulfilment
              </strong>

              <span>
                HomeLink checks the
                provider, amount,
                currency and
                reference before
                releasing credits.
              </span>
            </div>
          </div>
        </div>

        <div
          className={
            styles.gatewayPanel
          }
        >
          <div
            className={
              styles.gatewayHeading
            }
          >
            <div>
              <span>
                Step 1
              </span>

              <h3>
                Choose your payment
                gateway
              </h3>
            </div>

            <p>
              Use either approved
              provider. Paystack is
              recommended.
            </p>
          </div>

          {providerError ? (
            <div
              className={
                styles.gatewayError
              }
              role="alert"
            >
              <span>
                {providerError}
              </span>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  void loadMainData()
                }
              >
                {loading
                  ? "Trying again…"
                  : "Retry"}
              </button>
            </div>
          ) : visibleProviders
              .length > 0 ? (
            <div
              className={
                styles.providerOptions
              }
              role="radiogroup"
              aria-label="Payment gateway"
            >
              {visibleProviders.map(
                (provider) => {
                  const content =
                    providerCopy[
                      provider
                    ];

                  const active =
                    selectedProvider ===
                    provider;

                  if (!content) {
                    return null;
                  }

                  return (
                    <button
                      key={provider}
                      type="button"
                      role="radio"
                      aria-checked={
                        active
                      }
                      className={
                        active
                          ? styles
                              .activeProvider
                          : undefined
                      }
                      disabled={
                        buyingCode !==
                          null ||
                        checkingReference !==
                          null
                      }
                      onClick={() =>
                        setSelectedProvider(
                          provider,
                        )
                      }
                    >
                      <span
                        className={
                          styles
                            .providerMark
                        }
                        aria-hidden="true"
                      >
                        {active ? (
                          <Check />
                        ) : (
                          <CreditCard />
                        )}
                      </span>

                      <span
                        className={
                          styles
                            .providerText
                        }
                      >
                        <span>
                          <strong>
                            {
                              content
                                .label
                            }
                          </strong>

                          {provider ===
                          "paystack" ? (
                            <small>
                              Recommended
                            </small>
                          ) : null}
                        </span>

                        <span>
                          {
                            content
                              .description
                          }
                        </span>
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          ) : loading ? (
            <div
              className={
                styles
                  .providerSkeleton
              }
              aria-label="Loading payment gateways"
              aria-busy="true"
            />
          ) : (
            <div
              className={
                styles
                  .gatewayUnavailable
              }
              role="status"
            >
              Checkout is
              temporarily
              unavailable. Your
              existing credits are
              not affected.
            </div>
          )}
        </div>

        <div
          className={
            styles.packageStep
          }
        >
          <span>
            Step 2
          </span>

          <h3>
            Select a credit
            package
          </h3>
        </div>

        {loading &&
        plans.length === 0 ? (
          <div
            className={
              styles.planGrid
            }
            aria-label="Loading payment packages"
            aria-busy="true"
          >
            <span
              className={
                styles.srOnly
              }
            >
              Loading payment
              packages…
            </span>

            {Array.from(
              {
                length: 3,
              },
              (
                _,
                index,
              ) => (
                <div
                  key={index}
                  className={
                    styles
                      .planSkeleton
                  }
                  aria-hidden="true"
                />
              ),
            )}
          </div>
        ) : plans.length >
          0 ? (
          <div
            className={
              styles.planGrid
            }
          >
            {plans.map(
              (plan) => {
                const selected =
                  buyingCode ===
                  plan.code;

                const unitPrice =
                  plan.amount_kobo /
                  plan
                    .credit_quantity /
                  100;

                return (
                  <article
                    key={plan.id}
                    className={
                      styles
                        .planCard
                    }
                  >
                    <div
                      className={
                        styles
                          .planTop
                      }
                    >
                      <span>
                        {titleCase(
                          plan
                            .credit_type,
                        )}
                      </span>

                      <span
                        className={
                          styles
                            .quantity
                        }
                      >
                        {
                          plan
                            .credit_quantity
                        }{" "}
                        {plan
                          .credit_quantity ===
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
                        styles
                          .planPrice
                      }
                    >
                      <span>
                        Package price
                      </span>

                      <strong>
                        {formatCurrency(
                          plan.amount_kobo /
                            100,
                          plan.currency,
                        )}
                      </strong>

                      {plan
                        .credit_quantity >
                      1 ? (
                        <small>
                          {formatCurrency(
                            unitPrice,
                            plan.currency,
                          )}{" "}
                          per credit
                        </small>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      disabled={
                        buyingCode !==
                          null ||
                        checkingReference !==
                          null ||
                        selectedProvider ===
                          null
                      }
                      onClick={() =>
                        void buy(plan)
                      }
                    >
                      {selected ? (
                        <>
                          <Loader2
                            className={
                              styles
                                .spinner
                            }
                            aria-hidden="true"
                          />

                          Preparing
                          checkout…
                        </>
                      ) : (
                        <>
                          Continue with{" "}
                          {selectedProvider
                            ? titleCase(
                                selectedProvider,
                              )
                            : "gateway"}

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
              styles.emptyState
            }
          >
            <strong>
              No packages
              available.
            </strong>

            <span>
              Payment packages
              have not been made
              available yet.
            </span>
          </div>
        )}
      </section>

      <section
        className={
          styles.historySection
        }
        aria-labelledby="history-title"
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              Transaction history
            </span>

            <h2
              id="history-title"
            >
              Recent payments.
            </h2>
          </div>

          <p>
            Review your latest
            purchases. Pending
            payments are checked
            only when requested,
            so this page does not
            constantly poll the
            API.
          </p>
        </div>

        {historyError ? (
          <div
            className={
              styles.historyError
            }
            role="alert"
          >
            <span>
              {historyError}
            </span>

            <button
              type="button"
              disabled={
                historyLoading
              }
              onClick={() =>
                void loadHistory(
                  true,
                )
              }
            >
              <RefreshCw
                aria-hidden="true"
                className={
                  historyLoading
                    ? styles.spinner
                    : undefined
                }
              />

              {historyLoading
                ? "Trying again…"
                : "Retry"}
            </button>
          </div>
        ) : null}

        {historyLoading &&
        payments.length === 0 ? (
          <div
            className={
              styles
                .historySkeleton
            }
            aria-label="Loading payment history"
            aria-busy="true"
          />
        ) : payments.length >
          0 ? (
          <div
            className={
              styles.historyList
            }
          >
            {payments.map(
              (payment) => {
                const checking =
                  checkingReference ===
                  payment.reference;

                return (
                  <article
                    key={payment.id}
                    className={
                      styles
                        .historyItem
                    }
                  >
                    <div
                      className={
                        styles
                          .historyMain
                      }
                    >
                      <strong>
                        {
                          payment.plan
                            .name
                        }
                      </strong>

                      <span>
                        {formatPaymentDate(
                          payment.paid_at ??
                            payment
                              .created_at,
                        )}
                      </span>
                    </div>

                    <div
                      className={
                        styles
                          .historyMeta
                      }
                    >
                      <span
                        title={
                          payment
                            .reference
                        }
                      >
                        {
                          payment
                            .reference
                        }
                      </span>

                      <span>
                        Paid with{" "}
                        {titleCase(
                          payment
                            .provider,
                        )}
                      </span>
                    </div>

                    <div
                      className={
                        styles
                          .historyAmount
                      }
                    >
                      <strong>
                        {formatCurrency(
                          payment
                            .amount_kobo /
                            100,
                          payment.currency,
                        )}
                      </strong>

                      <span
                        data-status={
                          payment.status
                        }
                      >
                        {titleCase(
                          payment.status,
                        )}
                      </span>

                      {payment.status ===
                      "pending" ? (
                        <button
                          type="button"
                          className={
                            styles
                              .checkStatusButton
                          }
                          disabled={
                            checkingReference !==
                              null ||
                            buyingCode !==
                              null
                          }
                          onClick={() =>
                            void checkPayment(
                              payment,
                            )
                          }
                        >
                          {checking ? (
                            <>
                              <Loader2
                                className={
                                  styles
                                    .spinner
                                }
                                aria-hidden="true"
                              />

                              Checking…
                            </>
                          ) : (
                            <>
                              <RefreshCw
                                aria-hidden="true"
                              />

                              Check status
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        ) : (
          <div
            className={
              styles.emptyState
            }
          >
            <strong>
              No payments yet.
            </strong>

            <span>
              Your completed and
              pending purchases
              will appear here.
            </span>
          </div>
        )}
      </section>
    </main>
  );
}