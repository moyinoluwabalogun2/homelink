"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  Building2,
  ChevronDown,
  Coins,
  Home,
  RefreshCw,
  Store,
} from "lucide-react";

import type {
  CreditBalance,
  CreditType,
} from "@/types/payment";

import styles from "./CreditBadge.module.css";


interface CreditBadgeProps {
  credits:
    CreditBalance[] | null;

  loading?: boolean;
}


interface CreditDefinition {
  type: CreditType;
  label: string;
  description: string;
  icon: typeof Store;
}


const creditDefinitions:
  CreditDefinition[] = [
  {
    type: "marketplace",
    label: "Marketplace",
    description:
      "Student items",
    icon: Store,
  },
  {
    type: "rental",
    label: "Rentals",
    description:
      "Rental listings",
    icon: Home,
  },
  {
    type: "buy_property",
    label: "Property",
    description:
      "Properties for sale",
    icon: Building2,
  },
];


function getCreditTotal(
  balance:
    CreditBalance | undefined,
): number {
  return balance
    ? (
        balance.free_remaining
        +
        balance.paid_remaining
      )
    : 0;
}


export default function CreditBadge({
  credits,
  loading = false,
}: CreditBadgeProps) {
  const [
    open,
    setOpen,
  ] = useState(false);


  const rootRef =
    useRef<HTMLDivElement>(
      null,
    );

  const triggerRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const panelId =
    useId();


  const balances =
    useMemo(
      () =>
        new Map<
          CreditType,
          CreditBalance
        >(
          (credits ?? []).map(
            (balance) => [
              balance.credit_type,
              balance,
            ],
          ),
        ),
      [
        credits,
      ],
    );


  const totalCredits =
    useMemo(
      () =>
        creditDefinitions.reduce(
          (
            total,
            definition,
          ) =>
            total
            +
            getCreditTotal(
              balances.get(
                definition.type,
              ),
            ),
          0,
        ),
      [
        balances,
      ],
    );


  useEffect(() => {
    if (!open) {
      return;
    }


    const handleOutsidePress = (
      event: PointerEvent,
    ) => {
      if (
        rootRef.current
        &&
        !rootRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    };


    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(false);

        triggerRef
          .current
          ?.focus();
      }
    };


    document.addEventListener(
      "pointerdown",
      handleOutsidePress,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );


    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsidePress,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    open,
  ]);


  return (
    <div
      ref={rootRef}
      className={styles.root}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.badge}
        aria-expanded={open}
        aria-controls={
          open
            ? panelId
            : undefined
        }
        aria-haspopup="dialog"
        aria-label={
          "View posting credit balances"
        }
        onClick={() => {
          setOpen(
            (current) =>
              !current,
          );
        }}
      >
        <span
          className={styles.icon}
        >
          {loading ? (
            <RefreshCw
              aria-hidden="true"
              className={
                styles.loadingIcon
              }
            />
          ) : (
            <Coins
              aria-hidden="true"
            />
          )}
        </span>


        <span
          className={styles.copy}
        >
          <small>
            Credits
          </small>

          <strong>
            {loading
              ? "Loading…"
              : credits === null
                ? "Unavailable"
                : `${totalCredits} total`}
          </strong>
        </span>


        <ChevronDown
          aria-hidden="true"
          className={`
            ${styles.chevron}
            ${
              open
                ? styles.chevronOpen
                : ""
            }
          `}
        />
      </button>


      {open ? (
        <div
          id={panelId}
          className={styles.panel}
          role="dialog"
          aria-label={
            "Posting credit balances"
          }
          aria-live="polite"
          aria-busy={loading}
        >
          <div
            className={
              styles.panelHeader
            }
          >
            <div>
              <span>
                Available credits
              </span>

              <strong>
                {loading
                  ? "Loading…"
                  : credits === null
                    ? "Unavailable"
                    : `${totalCredits} total`}
              </strong>
            </div>

            <span
              className={
                styles.totalIcon
              }
            >
              <Coins
                aria-hidden="true"
              />
            </span>
          </div>


          <div
            className={
              styles.balanceList
            }
          >
            {creditDefinitions.map(
              (definition) => {
                const balance =
                  balances.get(
                    definition.type,
                  );

                const Icon =
                  definition.icon;


                return (
                  <div
                    key={
                      definition.type
                    }
                    className={
                      styles.balanceRow
                    }
                  >
                    <span
                      className={
                        styles.balanceIcon
                      }
                    >
                      <Icon
                        aria-hidden="true"
                      />
                    </span>


                    <div
                      className={
                        styles.balanceCopy
                      }
                    >
                      <strong>
                        {
                          definition.label
                        }
                      </strong>

                      <span>
                        {
                          definition.description
                        }
                      </span>
                    </div>


                    <div
                      className={
                        styles.balanceAmount
                      }
                    >
                      <strong>
                        {
                          loading ||
                          credits === null
                            ? "—"
                            : getCreditTotal(
                                balance,
                              )
                        }
                      </strong>

                      <span>
                        {
                          balance &&
                          credits !== null
                            ? (
                                `${balance.free_remaining} free · ${balance.paid_remaining} paid`
                              )
                            : (
                                "credit balance"
                              )
                        }
                      </span>
                    </div>
                  </div>
                );
              },
            )}
          </div>


          <p
            className={
              styles.note
            }
          >
            Credits are category-specific
            and cannot be moved between
            listing types.
          </p>


          <Link
            href="/dashboard/credits"
            className={
              styles.manageLink
            }
            onClick={() => {
              setOpen(false);
            }}
          >
            Manage credits and payments
          </Link>
        </div>
      ) : null}
    </div>
  );
}