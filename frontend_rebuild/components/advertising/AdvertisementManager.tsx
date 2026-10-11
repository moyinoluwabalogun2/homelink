"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  Eye,
  Loader2,
  MousePointerClick,
  Save,
  ShieldCheck,
} from "lucide-react";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  advertisingService,
} from "@/services/advertising-service";

import type {
  Advertisement,
  AdvertisementPaymentProvider,
  AdvertisementPlacement,
} from "@/types/advertising";

import styles
  from "./AdvertisementManager.module.css";


const MANAGEMENT_TOKEN_KEY =
  "homelink:advertisement:management-token";

const PAYMENT_REFERENCE_KEY =
  "homelink:advertisement:payment-reference";

const ADVERTISEMENT_REFERENCE_KEY =
  "homelink:advertisement:reference";


interface EditForm {
  businessName: string;
  headline: string;
  description: string;
  callToAction: string;
  destinationUrl: string;
  contactEmail: string;
  contactPhone: string;
  placement: AdvertisementPlacement;
  preferredStartDate: string;
}


const placementOptions: Array<{
  value: AdvertisementPlacement;
  label: string;
}> = [
  {
    value: "homepage",
    label: "Homepage",
  },
  {
    value: "discovery",
    label: "Property discovery",
  },
  {
    value: "marketplace",
    label: "Marketplace",
  },
  {
    value: "listing_detail",
    label: "Listing details",
  },
];


const editableStatuses =
  new Set([
    "payment_pending",
    "changes_requested",
  ]);


const cancellableStatuses =
  new Set([
    "payment_pending",
    "pending_review",
    "changes_requested",
    "scheduled",
  ]);


function formFromAdvertisement(
  advertisement: Advertisement,
): EditForm {
  return {
    businessName:
      advertisement.business_name,

    headline:
      advertisement.headline,

    description:
      advertisement.description,

    callToAction:
      advertisement.call_to_action,

    destinationUrl:
      advertisement.destination_url,

    contactEmail:
      advertisement.contact_email,

    contactPhone:
      advertisement.contact_phone ??
      "",

    placement:
      advertisement.placement,

    preferredStartDate:
      advertisement
        .preferred_start_date ??
      "",
  };
}


function formatMoney(
  amountKobo: number,
): string {
  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    },
  ).format(
    amountKobo / 100,
  );
}


function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not scheduled";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}


function statusLabel(
  status: Advertisement["status"],
): string {
  const labels:
    Record<
      Advertisement["status"],
      string
    > = {
    payment_pending:
      "Awaiting payment",

    pending_review:
      "Pending review",

    changes_requested:
      "Changes requested",

    scheduled:
      "Scheduled",

    live:
      "Live",

    completed:
      "Completed",

    rejected:
      "Rejected",

    cancelled:
      "Cancelled",
  };

  return labels[status];
}


function readFragmentToken():
  string | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const fragment =
    window.location.hash
      .replace(
        /^#/,
        "",
      )
      .trim();

  if (!fragment) {
    return null;
  }

  const rawToken =
    fragment.startsWith(
      "token=",
    )
      ? fragment.slice(
          "token=".length,
        )
      : fragment;

  try {
    return decodeURIComponent(
      rawToken,
    ).trim() || null;

  } catch {
    return rawToken || null;
  }
}


function privateManagementUrl(
  managementToken: string,
): string {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  return (
    `${window.location.origin}` +
    "/advertise/manage#" +
    encodeURIComponent(
      managementToken,
    )
  );
}


export default function AdvertisementManager() {
  const [
    managementToken,
    setManagementToken,
  ] = useState<string | null>(
    null,
  );

  const [
    advertisement,
    setAdvertisement,
  ] = useState<
    Advertisement | null
  >(null);

  const [
    editForm,
    setEditForm,
  ] = useState<
    EditForm | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    cancelling,
    setCancelling,
  ] = useState(false);

  const [
    paymentLoading,
    setPaymentLoading,
  ] = useState(false);

  const [
    paymentProvider,
    setPaymentProvider,
  ] = useState<
    Exclude<
      AdvertisementPaymentProvider,
      "mock"
    >
  >("paystack");

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    success,
    setSuccess,
  ] = useState<string | null>(
    null,
  );


  const earliestStartDate =
    useMemo(
      () => {
        const now =
          new Date();

        const localDate =
          new Date(
            now.getTime() -
            now.getTimezoneOffset() *
              60_000,
          );

        return localDate
          .toISOString()
          .slice(
            0,
            10,
          );
      },
      [],
    );


  const loadAdvertisement =
    useCallback(
      async (
        token: string,
      ): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
          const result =
            await advertisingService
              .getManaged(token);

          setAdvertisement(
            result,
          );

          setEditForm(
            formFromAdvertisement(
              result,
            ),
          );

          sessionStorage.setItem(
            MANAGEMENT_TOKEN_KEY,
            token,
          );

          sessionStorage.setItem(
            ADVERTISEMENT_REFERENCE_KEY,
            result.reference,
          );

        } catch (reason) {
          setError(
            getApiErrorMessage(
              reason,
              "The private advertisement link is invalid or has expired.",
            ),
          );

        } finally {
          setLoading(false);
        }
      },
      [],
    );


  useEffect(
    () => {
      const fragmentToken =
        readFragmentToken();

      const storedToken =
        sessionStorage.getItem(
          MANAGEMENT_TOKEN_KEY,
        );

      const token =
        fragmentToken ||
        storedToken;

      if (!token) {
        setLoading(false);

        setError(
          "The private advertisement management token is missing.",
        );

        return;
      }

      setManagementToken(
        token,
      );

      void loadAdvertisement(
        token,
      );
    },
    [
      loadAdvertisement,
    ],
  );


  function updateField<
    Field extends keyof EditForm,
  >(
    field: Field,
    value: EditForm[Field],
  ): void {
    setEditForm(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          [field]: value,
        };
      },
    );
  }


  async function saveChanges(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (
      !managementToken ||
      !advertisement ||
      !editForm
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated =
        await advertisingService
          .updateManaged({
            management_token:
              managementToken,

            business_name:
              editForm
                .businessName
                .trim(),

            headline:
              editForm
                .headline
                .trim(),

            description:
              editForm
                .description
                .trim(),

            call_to_action:
              editForm
                .callToAction
                .trim(),

            destination_url:
              editForm
                .destinationUrl
                .trim(),

            contact_email:
              editForm
                .contactEmail
                .trim(),

            contact_phone:
              editForm
                .contactPhone
                .trim() ||
              null,

            placement:
              editForm.placement,

            area_id:
              advertisement.area_id,

            preferred_start_date:
              editForm
                .preferredStartDate ||
              null,
          });

      setAdvertisement(
        updated,
      );

      setEditForm(
        formFromAdvertisement(
          updated,
        ),
      );

      setSuccess(
        "Advertisement changes saved successfully.",
      );

    } catch (reason) {
      setError(
        getApiErrorMessage(
          reason,
          "The advertisement changes could not be saved.",
        ),
      );

    } finally {
      setSaving(false);
    }
  }


  async function cancelAdvertisement():
    Promise<void> {
    if (
      !managementToken ||
      !advertisement
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Cancel this advertisement? This action cannot be undone.",
      );

    if (!confirmed) {
      return;
    }

    setCancelling(true);
    setError(null);
    setSuccess(null);

    try {
      const updated =
        await advertisingService
          .cancelManaged(
            managementToken,
          );

      setAdvertisement(
        updated,
      );

      setEditForm(
        formFromAdvertisement(
          updated,
        ),
      );

      setSuccess(
        "Advertisement cancelled.",
      );

    } catch (reason) {
      setError(
        getApiErrorMessage(
          reason,
          "The advertisement could not be cancelled.",
        ),
      );

    } finally {
      setCancelling(false);
    }
  }


  async function beginPayment():
    Promise<void> {
    if (
      !managementToken ||
      !advertisement
    ) {
      return;
    }

    setPaymentLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result =
        await advertisingService
          .initializePayment(
            managementToken,
            paymentProvider,
          );

      sessionStorage.setItem(
        MANAGEMENT_TOKEN_KEY,
        managementToken,
      );

      sessionStorage.setItem(
        PAYMENT_REFERENCE_KEY,
        result.payment.reference,
      );

      sessionStorage.setItem(
        ADVERTISEMENT_REFERENCE_KEY,
        advertisement.reference,
      );

      window.location.assign(
        result.authorization_url,
      );

    } catch (reason) {
      setError(
        getApiErrorMessage(
          reason,
          "Secure checkout could not be opened.",
        ),
      );

      setPaymentLoading(false);
    }
  }


  async function copyPrivateLink():
    Promise<void> {
    if (!managementToken) {
      return;
    }

    const url =
      privateManagementUrl(
        managementToken,
      );

    try {
      await navigator.clipboard
        .writeText(url);

      setCopied(true);

      window.setTimeout(
        () => {
          setCopied(false);
        },
        2200,
      );

    } catch {
      setError(
        "The private link could not be copied automatically.",
      );
    }
  }


  if (loading) {
    return (
      <main className={styles.statePage}>
        <Loader2
          className={styles.spinner}
          aria-hidden="true"
        />

        <h1>
          Loading advertisement
        </h1>

        <p>
          Checking the private campaign details…
        </p>
      </main>
    );
  }


  if (
    !advertisement ||
    !editForm ||
    !managementToken
  ) {
    return (
      <main className={styles.statePage}>
        <ShieldCheck
          aria-hidden="true"
        />

        <h1>
          Advertisement unavailable
        </h1>

        <p>
          {error ||
            "The private management information could not be found."}
        </p>

        <div className={styles.stateActions}>
          <Link href="/advertise">
            Create an advert
          </Link>

          <Link href="/support">
            Contact support
          </Link>
        </div>
      </main>
    );
  }


  const canEdit =
    editableStatuses.has(
      advertisement.status,
    );

  const canCancel =
    cancellableStatuses.has(
      advertisement.status,
    );

  const needsPayment =
    advertisement.status ===
    "payment_pending";

  const clickThroughRate =
    advertisement.impression_count >
    0
      ? (
          (
            advertisement.click_count /
            advertisement.impression_count
          ) * 100
        ).toFixed(1)
      : "0.0";


  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            href="/"
            className={styles.backLink}
          >
            <ArrowLeft
              aria-hidden="true"
            />

            Home
          </Link>

          <button
            type="button"
            className={styles.copyLink}
            onClick={() =>
              void copyPrivateLink()
            }
          >
            {copied ? (
              <Check
                aria-hidden="true"
              />
            ) : (
              <Copy
                aria-hidden="true"
              />
            )}

            {copied
              ? "Private link copied"
              : "Copy private link"}
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            Campaign{" "}
            {advertisement.reference}
          </span>

          <h1>
            {advertisement.headline}
          </h1>

          <p>
            Manage your campaign, payment,
            review status and performance from
            this private page.
          </p>
        </div>

        <div
          className={styles.statusCard}
          data-status={
            advertisement.status
          }
        >
          <span>Current status</span>

          <strong>
            {statusLabel(
              advertisement.status,
            )}
          </strong>

          <small>
            Updated{" "}
            {formatDate(
              advertisement.updated_at,
            )}
          </small>
        </div>
      </section>

      <section className={styles.shell}>
        {error ? (
          <div
            className={styles.errorBanner}
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            className={styles.successBanner}
            role="status"
          >
            {success}
          </div>
        ) : null}

        {advertisement.status ===
        "changes_requested" ? (
          <div className={styles.reviewNotice}>
            <ShieldCheck
              aria-hidden="true"
            />

            <div>
              <strong>
                HomeLink requested changes
              </strong>

              <p>
                {advertisement.review_notes ||
                  "Review the campaign information, make the requested changes and save it again."}
              </p>
            </div>
          </div>
        ) : null}

        {advertisement.status ===
        "rejected" ? (
          <div className={styles.rejectionNotice}>
            <strong>
              Advertisement rejected
            </strong>

            <p>
              {advertisement
                .rejection_reason ||
                "The advertisement did not meet HomeLink’s advertising requirements."}
            </p>
          </div>
        ) : null}

        {needsPayment ? (
          <section className={styles.paymentPanel}>
            <div>
              <span className={styles.sectionLabel}>
                Payment required
              </span>

              <h2>
                Complete your ₦5,000 payment
              </h2>

              <p>
                Payment places the campaign into
                HomeLink’s review queue. The
                seven-day timer begins only after
                approval and activation.
              </p>
            </div>

            <div className={styles.paymentControls}>
              <div className={styles.providers}>
                <button
                  type="button"
                  className={
                    paymentProvider ===
                    "paystack"
                      ? styles.activeProvider
                      : ""
                  }
                  onClick={() =>
                    setPaymentProvider(
                      "paystack",
                    )
                  }
                >
                  Paystack
                </button>

                <button
                  type="button"
                  className={
                    paymentProvider ===
                    "flutterwave"
                      ? styles.activeProvider
                      : ""
                  }
                  onClick={() =>
                    setPaymentProvider(
                      "flutterwave",
                    )
                  }
                >
                  Flutterwave
                </button>
              </div>

              <button
                type="button"
                className={styles.payButton}
                disabled={paymentLoading}
                onClick={() =>
                  void beginPayment()
                }
              >
                {paymentLoading ? (
                  <Loader2
                    className={
                      styles.spinner
                    }
                    aria-hidden="true"
                  />
                ) : (
                  <CreditCard
                    aria-hidden="true"
                  />
                )}

                {paymentLoading
                  ? "Opening checkout…"
                  : `Pay ${formatMoney(
                      advertisement
                        .amount_kobo,
                    )}`}
              </button>
            </div>
          </section>
        ) : null}

        <section className={styles.dashboardGrid}>
          <article className={styles.previewCard}>
            <div className={styles.cardHeading}>
              <div>
                <span className={styles.sectionLabel}>
                  Campaign preview
                </span>

                <h2>
                  Public advertisement
                </h2>
              </div>
            </div>

            <div className={styles.previewImage}>
              <Image
                src={
                  advertisement.image_url
                }
                alt={`${advertisement.business_name} advertisement`}
                fill
                unoptimized
                sizes="(max-width: 800px) 100vw, 540px"
              />
            </div>

            <div className={styles.previewCopy}>
              <span>
                {
                  advertisement
                    .business_name
                }
              </span>

              <h3>
                {advertisement.headline}
              </h3>

              <p>
                {advertisement.description}
              </p>

              <strong>
                {
                  advertisement
                    .call_to_action
                }
              </strong>
            </div>
          </article>

          <aside className={styles.metrics}>
            <article>
              <Eye aria-hidden="true" />

              <span>Impressions</span>

              <strong>
                {advertisement
                  .impression_count
                  .toLocaleString()}
              </strong>
            </article>

            <article>
              <MousePointerClick
                aria-hidden="true"
              />

              <span>Clicks</span>

              <strong>
                {advertisement
                  .click_count
                  .toLocaleString()}
              </strong>
            </article>

            <article>
              <span className={styles.metricSymbol}>
                %
              </span>

              <span>
                Click-through rate
              </span>

              <strong>
                {clickThroughRate}%
              </strong>
            </article>
          </aside>
        </section>

        <section className={styles.scheduleCard}>
          <div>
            <span>Placement</span>

            <strong>
              {placementOptions.find(
                (option) =>
                  option.value ===
                  advertisement.placement,
              )?.label}
            </strong>
          </div>

          <div>
            <span>Preferred start</span>

            <strong>
              {advertisement
                .preferred_start_date ||
                "No preference"}
            </strong>
          </div>

          <div>
            <span>Campaign starts</span>

            <strong>
              {formatDate(
                advertisement.starts_at,
              )}
            </strong>
          </div>

          <div>
            <span>Campaign ends</span>

            <strong>
              {formatDate(
                advertisement.ends_at,
              )}
            </strong>
          </div>
        </section>

        <section className={styles.editor}>
          <div className={styles.editorHeading}>
            <div>
              <span className={styles.sectionLabel}>
                Campaign information
              </span>

              <h2>
                {canEdit
                  ? "Edit advertisement"
                  : "Advertisement details"}
              </h2>
            </div>

            {!canEdit ? (
              <span className={styles.locked}>
                Editing unavailable at this
                stage
              </span>
            ) : null}
          </div>

          <form
            onSubmit={
              saveChanges
            }
          >
            <fieldset
              disabled={
                !canEdit ||
                saving
              }
            >
              <div className={styles.twoColumns}>
                <label>
                  <span>
                    Business name
                  </span>

                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={
                      editForm.businessName
                    }
                    onChange={(event) =>
                      updateField(
                        "businessName",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    Contact email
                  </span>

                  <input
                    required
                    type="email"
                    value={
                      editForm.contactEmail
                    }
                    onChange={(event) =>
                      updateField(
                        "contactEmail",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>

              <div className={styles.twoColumns}>
                <label>
                  <span>
                    Contact phone
                  </span>

                  <input
                    type="tel"
                    maxLength={40}
                    value={
                      editForm.contactPhone
                    }
                    onChange={(event) =>
                      updateField(
                        "contactPhone",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    Destination URL
                  </span>

                  <input
                    required
                    type="url"
                    value={
                      editForm.destinationUrl
                    }
                    onChange={(event) =>
                      updateField(
                        "destinationUrl",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>

              <label>
                <span>Headline</span>

                <input
                  required
                  minLength={3}
                  maxLength={120}
                  value={
                    editForm.headline
                  }
                  onChange={(event) =>
                    updateField(
                      "headline",
                      event.target.value,
                    )
                  }
                />

                <small>
                  {
                    editForm
                      .headline
                      .length
                  }
                  /120
                </small>
              </label>

              <label>
                <span>Description</span>

                <textarea
                  required
                  minLength={10}
                  maxLength={500}
                  rows={5}
                  value={
                    editForm.description
                  }
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value,
                    )
                  }
                />

                <small>
                  {
                    editForm
                      .description
                      .length
                  }
                  /500
                </small>
              </label>

              <div className={styles.twoColumns}>
                <label>
                  <span>Button text</span>

                  <input
                    required
                    minLength={2}
                    maxLength={40}
                    value={
                      editForm.callToAction
                    }
                    onChange={(event) =>
                      updateField(
                        "callToAction",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  <span>Placement</span>

                  <select
                    value={
                      editForm.placement
                    }
                    onChange={(event) =>
                      updateField(
                        "placement",
                        event.target
                          .value as
                          AdvertisementPlacement,
                      )
                    }
                  >
                    {placementOptions.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <label>
                <span>
                  Preferred start date
                </span>

                <input
                  type="date"
                  min={
                    earliestStartDate
                  }
                  value={
                    editForm
                      .preferredStartDate
                  }
                  onChange={(event) =>
                    updateField(
                      "preferredStartDate",
                      event.target.value,
                    )
                  }
                />
              </label>
            </fieldset>

            {canEdit ? (
              <button
                type="submit"
                className={styles.saveButton}
                disabled={saving}
              >
                {saving ? (
                  <Loader2
                    className={
                      styles.spinner
                    }
                    aria-hidden="true"
                  />
                ) : (
                  <Save
                    aria-hidden="true"
                  />
                )}

                {saving
                  ? "Saving changes…"
                  : "Save changes"}
              </button>
            ) : null}
          </form>
        </section>

        <section className={styles.dangerZone}>
          <div>
            <span>
              Campaign controls
            </span>

            <p>
              Cancellation cannot be undone.
              Payment and refund eligibility
              remain subject to HomeLink’s terms.
            </p>
          </div>

          {canCancel ? (
            <button
              type="button"
              disabled={cancelling}
              onClick={() =>
                void cancelAdvertisement()
              }
            >
              {cancelling
                ? "Cancelling…"
                : "Cancel advertisement"}
            </button>
          ) : (
            <span>
              Cancellation unavailable
            </span>
          )}
        </section>
      </section>
    </main>
  );
}