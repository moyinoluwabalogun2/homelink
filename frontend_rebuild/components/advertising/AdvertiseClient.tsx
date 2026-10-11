"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ImageIcon,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import {
  getApiErrorMessage,
} from "@/lib/api-errors";

import {
  advertisingService,
} from "@/services/advertising-service";

import {
  mediaService,
} from "@/services/media-service";

import type {
  Advertisement,
  AdvertisementPaymentProvider,
  AdvertisementPlacement,
} from "@/types/advertising";

import styles
  from "./AdvertiseClient.module.css";


const MANAGEMENT_TOKEN_KEY =
  "homelink:advertisement:management-token";

const PAYMENT_REFERENCE_KEY =
  "homelink:advertisement:payment-reference";

const ADVERTISEMENT_REFERENCE_KEY =
  "homelink:advertisement:reference";


interface AdvertFormState {
  businessName: string;
  headline: string;
  description: string;
  callToAction: string;
  destinationUrl: string;
  contactEmail: string;
  contactPhone: string;
  placement: AdvertisementPlacement;
  preferredStartDate: string;
  acceptedTerms: boolean;
}


const initialForm:
  AdvertFormState = {
  businessName: "",
  headline: "",
  description: "",
  callToAction:
    "Learn more",
  destinationUrl: "",
  contactEmail: "",
  contactPhone: "",
  placement: "homepage",
  preferredStartDate: "",
  acceptedTerms: false,
};


const placementOptions: Array<{
  value: AdvertisementPlacement;
  label: string;
  description: string;
}> = [
  {
    value: "homepage",
    label: "Homepage",
    description:
      "High-visibility placement on the HomeLink homepage.",
  },
  {
    value: "discovery",
    label: "Property discovery",
    description:
      "Appear while people explore rentals and property.",
  },
  {
    value: "marketplace",
    label: "Marketplace",
    description:
      "Reach students browsing products and services.",
  },
  {
    value: "listing_detail",
    label: "Listing details",
    description:
      "Appear while visitors review an individual listing.",
  },
];


function formatNairaFromKobo(
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


function makeManagementUrl(
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


export default function AdvertiseClient() {
  const [
    form,
    setForm,
  ] = useState<AdvertFormState>(
    initialForm,
  );

  const [
    imageFile,
    setImageFile,
  ] = useState<File | null>(
    null,
  );

  const [
    imagePreview,
    setImagePreview,
  ] = useState<string | null>(
    null,
  );

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(0);

  const [
    submitting,
    setSubmitting,
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
    paymentLoading,
    setPaymentLoading,
  ] = useState(false);

  const [
    createdAdvertisement,
    setCreatedAdvertisement,
  ] = useState<
    Advertisement | null
  >(null);

  const [
    managementToken,
    setManagementToken,
  ] = useState<string | null>(
    null,
  );

  const [
    managementUrl,
    setManagementUrl,
  ] = useState("");

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


  useEffect(
    () => {
      return () => {
        if (imagePreview) {
          URL.revokeObjectURL(
            imagePreview,
          );
        }
      };
    },
    [imagePreview],
  );


  function updateField<
    Field extends keyof AdvertFormState,
  >(
    field: Field,
    value: AdvertFormState[Field],
  ): void {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  }


  function chooseImage(
    file: File | null,
  ): void {
    setError(null);

    if (
      imagePreview
    ) {
      URL.revokeObjectURL(
        imagePreview,
      );
    }

    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      setUploadProgress(0);
      return;
    }

    const allowedTypes =
      new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
      ]);

    if (
      !allowedTypes.has(
        file.type,
      )
    ) {
      setImageFile(null);
      setImagePreview(null);

      setError(
        "Use a JPG, PNG or WebP image.",
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setImageFile(null);
      setImagePreview(null);

      setError(
        "Advertisement images must not exceed 5 MB.",
      );

      return;
    }

    setImageFile(file);

    setImagePreview(
      URL.createObjectURL(
        file,
      ),
    );

    setUploadProgress(0);
  }


  async function submitAdvertisement(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!imageFile) {
      setError(
        "Choose an advertisement image before continuing.",
      );

      return;
    }

    if (
      !form.acceptedTerms
    ) {
      setError(
        "Please confirm that you have permission to advertise this business.",
      );

      return;
    }

    setSubmitting(true);
    setError(null);
    setUploadProgress(0);

    try {
      const uploadedImage =
        await mediaService
          .uploadAdvertisementImage({
            file:
              imageFile,

            onProgress:
              setUploadProgress,
          });

      const result =
        await advertisingService.create({
          business_name:
            form.businessName.trim(),

          headline:
            form.headline.trim(),

          description:
            form.description.trim(),

          call_to_action:
            form.callToAction.trim(),

          destination_url:
            form.destinationUrl.trim(),

          contact_email:
            form.contactEmail.trim(),

          contact_phone:
            form.contactPhone.trim() ||
            null,

          placement:
            form.placement,

          area_id:
            null,

          preferred_start_date:
            form.preferredStartDate ||
            null,

          image_public_id:
            uploadedImage.publicId,

          image_claim_token:
            uploadedImage.claimToken,
        });

      const privateUrl =
        makeManagementUrl(
          result.management_token,
        );

      sessionStorage.setItem(
        MANAGEMENT_TOKEN_KEY,
        result.management_token,
      );

      sessionStorage.setItem(
        ADVERTISEMENT_REFERENCE_KEY,
        result.advertisement.reference,
      );

      setCreatedAdvertisement(
        result.advertisement,
      );

      setManagementToken(
        result.management_token,
      );

      setManagementUrl(
        privateUrl,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    } catch (reason) {
      setError(
        getApiErrorMessage(
          reason,
          "Your advertisement could not be submitted. Please try again.",
        ),
      );

    } finally {
      setSubmitting(false);
    }
  }


  async function copyManagementLink():
    Promise<void> {
    if (!managementUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        managementUrl,
      );

      setCopied(true);

      window.setTimeout(
        () => {
          setCopied(false);
        },
        2500,
      );

    } catch {
      setError(
        "The private link could not be copied automatically. Select and copy it manually.",
      );
    }
  }


  async function beginPayment():
    Promise<void> {
    if (
      !managementToken ||
      !createdAdvertisement
    ) {
      setError(
        "The private advertisement information is unavailable.",
      );

      return;
    }

    setPaymentLoading(true);
    setError(null);

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
        createdAdvertisement.reference,
      );

      window.location.assign(
        result.authorization_url,
      );

    } catch (reason) {
      setError(
        getApiErrorMessage(
          reason,
          "Payment checkout could not be opened. Please try again.",
        ),
      );

      setPaymentLoading(false);
    }
  }


  if (
    createdAdvertisement &&
    managementToken
  ) {
    return (
      <main className={styles.page}>
        <section className={styles.successHero}>
          <div className={styles.successMark}>
            <CheckCircle2
              aria-hidden="true"
            />
          </div>

          <span className={styles.eyebrow}>
            Advertisement created
          </span>

          <h1>
            Secure your seven-day campaign.
          </h1>

          <p>
            Your advertisement has been saved.
            Complete the ₦5,000 payment, then
            HomeLink will review it before it goes
            live.
          </p>
        </section>

        <section className={styles.checkoutShell}>
          {error ? (
            <div
              className={styles.errorBanner}
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className={styles.privateLinkCard}>
            <div className={styles.cardHeading}>
              <span>
                Private management link
              </span>

              <ShieldCheck
                aria-hidden="true"
              />
            </div>

            <h2>
              Save this link before paying
            </h2>

            <p>
              HomeLink only displays this private
              link once. It lets you return to your
              advert, see its status, make eligible
              edits and view campaign performance.
            </p>

            <div className={styles.linkField}>
              <input
                value={managementUrl}
                readOnly
                aria-label="Private advertisement management link"
              />

              <button
                type="button"
                onClick={
                  copyManagementLink
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
                  ? "Copied"
                  : "Copy"}
              </button>
            </div>

            <div className={styles.privateWarning}>
              Do not share this link publicly.
              Anyone with it may be able to manage
              the advertisement.
            </div>
          </div>

          <div className={styles.checkoutGrid}>
            <article className={styles.orderCard}>
              <span className={styles.cardLabel}>
                Campaign summary
              </span>

              <div className={styles.adPreview}>
                <div className={styles.adPreviewImage}>
                  <Image
                    src={
                      createdAdvertisement.image_url
                    }
                    alt=""
                    fill
                    unoptimized
                    sizes="180px"
                  />
                </div>

                <div>
                  <span>
                    {
                      createdAdvertisement
                        .business_name
                    }
                  </span>

                  <strong>
                    {
                      createdAdvertisement
                        .headline
                    }
                  </strong>

                  <small>
                    Placement:{" "}
                    {
                      placementOptions.find(
                        (option) =>
                          option.value ===
                          createdAdvertisement
                            .placement,
                      )?.label
                    }
                  </small>
                </div>
              </div>

              <dl className={styles.orderDetails}>
                <div>
                  <dt>Campaign duration</dt>
                  <dd>
                    {
                      createdAdvertisement
                        .duration_days
                    }{" "}
                    days
                  </dd>
                </div>

                <div>
                  <dt>Status</dt>
                  <dd>
                    Awaiting payment
                  </dd>
                </div>

                <div>
                  <dt>Amount</dt>
                  <dd>
                    {formatNairaFromKobo(
                      createdAdvertisement
                        .amount_kobo,
                    )}
                  </dd>
                </div>
              </dl>
            </article>

            <article className={styles.paymentCard}>
              <span className={styles.cardLabel}>
                Secure payment
              </span>

              <h2>
                Choose your payment provider
              </h2>

              <p>
                Both options process a real secure
                payment. HomeLink does not receive
                or store your card details.
              </p>

              <div className={styles.providerOptions}>
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
                  aria-pressed={
                    paymentProvider ===
                    "paystack"
                  }
                >
                  <span>Paystack</span>
                  <small>
                    Pay securely with Paystack
                  </small>
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
                  aria-pressed={
                    paymentProvider ===
                    "flutterwave"
                  }
                >
                  <span>Flutterwave</span>
                  <small>
                    Pay securely with Flutterwave
                  </small>
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
                    className={styles.spinner}
                    aria-hidden="true"
                  />
                ) : (
                  <CreditCard
                    aria-hidden="true"
                  />
                )}

                {paymentLoading
                  ? "Opening secure checkout…"
                  : `Pay ${formatNairaFromKobo(
                      createdAdvertisement
                        .amount_kobo,
                    )}`}
              </button>

              <div className={styles.paymentSafety}>
                <ShieldCheck
                  aria-hidden="true"
                />

                <span>
                  Your seven-day timer begins only
                  after payment, HomeLink approval
                  and campaign activation.
                </span>
              </div>
            </article>
          </div>
        </section>
      </main>
    );
  }


  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            HomeLink for business
          </span>

          <h1>
            Put your business in front of the
            right local audience.
          </h1>

          <p>
            Promote your business across HomeLink
            for seven days with a clean sponsored
            placement built into the browsing
            experience.
          </p>

          <div className={styles.heroActions}>
            <a href="#advert-form">
              Create your advert
              <ArrowRight
                aria-hidden="true"
              />
            </a>

            <Link href="/support">
              Ask a question
            </Link>
          </div>
        </div>

        <aside className={styles.packageCard}>
          <span>Seven-day campaign</span>

          <strong>₦5,000</strong>

          <p>
            One approved sponsored placement for
            seven active days.
          </p>

          <ul>
            <li>
              <Check aria-hidden="true" />
              Choose where the advert appears
            </li>

            <li>
              <Check aria-hidden="true" />
              Paystack or Flutterwave checkout
            </li>

            <li>
              <Check aria-hidden="true" />
              HomeLink review before activation
            </li>

            <li>
              <Check aria-hidden="true" />
              Impression and click reporting
            </li>
          </ul>
        </aside>
      </section>

      <section className={styles.process}>
        <article>
          <span>01</span>
          <strong>Create</strong>
          <p>
            Add your business information and
            campaign image.
          </p>
        </article>

        <article>
          <span>02</span>
          <strong>Pay</strong>
          <p>
            Complete the ₦5,000 checkout through
            your selected provider.
          </p>
        </article>

        <article>
          <span>03</span>
          <strong>Review</strong>
          <p>
            HomeLink reviews the advert for quality
            and safety.
          </p>
        </article>

        <article>
          <span>04</span>
          <strong>Go live</strong>
          <p>
            The seven-day timer starts when the
            approved campaign becomes active.
          </p>
        </article>
      </section>

      <section
        id="advert-form"
        className={styles.formSection}
      >
        <div className={styles.formIntroduction}>
          <span className={styles.eyebrow}>
            Create your campaign
          </span>

          <h2>
            Tell people what makes your business
            worth discovering.
          </h2>

          <p>
            Keep the message clear and use a
            high-quality image. HomeLink reviews
            every sponsored campaign before it
            appears publicly.
          </p>

          <div className={styles.guidance}>
            <ShieldCheck
              aria-hidden="true"
            />

            <div>
              <strong>
                Advert review
              </strong>

              <p>
                Misleading, unsafe, illegal or
                inappropriate promotions will not
                be approved.
              </p>
            </div>
          </div>
        </div>

        <form
          className={styles.form}
          onSubmit={
            submitAdvertisement
          }
        >
          {error ? (
            <div
              className={styles.errorBanner}
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <fieldset>
            <legend>
              Business information
            </legend>

            <div className={styles.twoColumns}>
              <label>
                <span>Business name</span>

                <input
                  required
                  minLength={2}
                  maxLength={160}
                  value={form.businessName}
                  onChange={(event) =>
                    updateField(
                      "businessName",
                      event.target.value,
                    )
                  }
                  placeholder="Your business name"
                />
              </label>

              <label>
                <span>Contact email</span>

                <input
                  required
                  type="email"
                  maxLength={254}
                  value={form.contactEmail}
                  onChange={(event) =>
                    updateField(
                      "contactEmail",
                      event.target.value,
                    )
                  }
                  placeholder="you@example.com"
                />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label>
                <span>
                  Contact phone
                  <small>Optional</small>
                </span>

                <input
                  type="tel"
                  maxLength={40}
                  value={form.contactPhone}
                  onChange={(event) =>
                    updateField(
                      "contactPhone",
                      event.target.value,
                    )
                  }
                  placeholder="+234..."
                />
              </label>

              <label>
                <span>
                  Website or destination URL
                </span>

                <input
                  required
                  type="url"
                  value={form.destinationUrl}
                  onChange={(event) =>
                    updateField(
                      "destinationUrl",
                      event.target.value,
                    )
                  }
                  placeholder="https://..."
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>
              Advert content
            </legend>

            <label>
              <span>Headline</span>

              <input
                required
                minLength={3}
                maxLength={120}
                value={form.headline}
                onChange={(event) =>
                  updateField(
                    "headline",
                    event.target.value,
                  )
                }
                placeholder="A short, clear campaign headline"
              />

              <small>
                {form.headline.length}/120
              </small>
            </label>

            <label>
              <span>Description</span>

              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={5}
                value={form.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value,
                  )
                }
                placeholder="Explain the offer, product or service people will discover."
              />

              <small>
                {form.description.length}/500
              </small>
            </label>

            <label>
              <span>Button text</span>

              <input
                required
                minLength={2}
                maxLength={40}
                value={form.callToAction}
                onChange={(event) =>
                  updateField(
                    "callToAction",
                    event.target.value,
                  )
                }
                placeholder="Learn more"
              />

              <small>
                Examples: Learn more, Shop now,
                Contact us
              </small>
            </label>
          </fieldset>

          <fieldset>
            <legend>
              Campaign placement
            </legend>

            <div className={styles.placementGrid}>
              {placementOptions.map(
                (option) => (
                  <label
                    key={option.value}
                    className={
                      form.placement ===
                      option.value
                        ? styles.selectedPlacement
                        : ""
                    }
                  >
                    <input
                      type="radio"
                      name="placement"
                      value={option.value}
                      checked={
                        form.placement ===
                        option.value
                      }
                      onChange={() =>
                        updateField(
                          "placement",
                          option.value,
                        )
                      }
                    />

                    <span>
                      {option.label}
                    </span>

                    <small>
                      {option.description}
                    </small>
                  </label>
                ),
              )}
            </div>

            <label>
              <span>
                Preferred start date
                <small>Optional</small>
              </span>

              <input
                type="date"
                min={earliestStartDate}
                value={
                  form.preferredStartDate
                }
                onChange={(event) =>
                  updateField(
                    "preferredStartDate",
                    event.target.value,
                  )
                }
              />

              <small>
                The exact activation time depends
                on payment, review and available
                campaign scheduling.
              </small>
            </label>
          </fieldset>

          <fieldset>
            <legend>
              Campaign image
            </legend>

            <div className={styles.uploadGrid}>
              <label className={styles.uploadBox}>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    chooseImage(
                      event.target.files
                        ?.item(0) ??
                      null,
                    )
                  }
                />

                <Upload
                  aria-hidden="true"
                />

                <strong>
                  Choose campaign image
                </strong>

                <span>
                  JPG, PNG or WebP · maximum 5 MB
                </span>

                <small>
                  Use a clear landscape image with
                  minimal text.
                </small>
              </label>

              <div className={styles.preview}>
                {imagePreview ? (
                  <>
                    <Image
                      src={imagePreview}
                      alt="Advertisement preview"
                      fill
                      unoptimized
                      sizes="(max-width: 700px) 100vw, 420px"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        chooseImage(null)
                      }
                      aria-label="Remove advertisement image"
                    >
                      <X aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <div className={styles.emptyPreview}>
                    <ImageIcon
                      aria-hidden="true"
                    />

                    <span>
                      Your campaign preview appears
                      here
                    </span>
                  </div>
                )}
              </div>
            </div>

            {submitting &&
            uploadProgress > 0 ? (
              <div
                className={styles.progress}
                aria-live="polite"
              >
                <div>
                  <span>
                    Uploading image
                  </span>

                  <strong>
                    {uploadProgress}%
                  </strong>
                </div>

                <span>
                  <i
                    style={{
                      width:
                        `${uploadProgress}%`,
                    }}
                  />
                </span>
              </div>
            ) : null}
          </fieldset>

          <label className={styles.confirmation}>
            <input
              required
              type="checkbox"
              checked={form.acceptedTerms}
              onChange={(event) =>
                updateField(
                  "acceptedTerms",
                  event.target.checked,
                )
              }
            />

            <span>
              I confirm that I am authorised to
              promote this business, the advert is
              accurate, and I accept HomeLink’s{" "}
              <Link href="/terms">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2
                className={styles.spinner}
                aria-hidden="true"
              />
            ) : (
              <ArrowRight
                aria-hidden="true"
              />
            )}

            {submitting
              ? "Creating your campaign…"
              : "Continue to secure payment"}
          </button>

          <p className={styles.submitNote}>
            You will review the private management
            link before choosing Paystack or
            Flutterwave.
          </p>
        </form>
      </section>
    </main>
  );
}