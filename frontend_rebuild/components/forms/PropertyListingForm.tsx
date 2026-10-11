"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  Building2,
  Home,
  Image as ImageIcon,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { toast } from "sonner";

import shared from "@/components/dashboard/DashboardPage.module.css";
import MediaUploader from "@/components/media/MediaUploader";

import { getApiErrorMessage } from "@/lib/api-errors";
import { titleCase } from "@/lib/formatters";

import { listingService } from "@/services/listing-service";
import { locationService } from "@/services/location-service";

import type {
  BuyPropertyCreatePayload,
  Listing,
  ListingMediaInput,
  PropertyCategory,
  PropertyCondition,
  RentalCategory,
  RentalCreatePayload,
  RentPeriod,
} from "@/types/listing";

import type {
  AreaRead,
  CampusRead,
} from "@/types/location";

import type {
  MediaValue,
} from "@/types/media";

import styles from "./PropertyListingForm.module.css";


type FormMode =
  | "rental"
  | "buy_property";


interface PropertyListingFormProps {
  mode: FormMode;
  listingId?: string;
}


interface FormValues {
  title: string;
  description: string;
  price: string;
  areaId: string;
  campusId: string;
  address: string;

  bedrooms: string;
  bathrooms: string;
  toilets: string;

  rentalCategory: RentalCategory;
  rentPeriod: RentPeriod;
  furnished: boolean;
  cautionFee: string;
  serviceCharge: string;
  distanceToCampus: string;

  propertyCategory: PropertyCategory;
  propertyCondition: PropertyCondition;
  landSize: string;
  titleDocument: string;
}


const INITIAL_VALUES: FormValues = {
  title: "",
  description: "",
  price: "",
  areaId: "",
  campusId: "",
  address: "",

  bedrooms: "",
  bathrooms: "",
  toilets: "",

  rentalCategory: "self_contain",
  rentPeriod: "yearly",
  furnished: false,
  cautionFee: "",
  serviceCharge: "",
  distanceToCampus: "",

  propertyCategory: "house",
  propertyCondition: "good",
  landSize: "",
  titleDocument: "",
};


const rentalCategories:
  RentalCategory[] = [
    "hostel",
    "single_room",
    "self_contain",
    "shared_apartment",
    "mini_flat",
    "flat",
    "duplex",
  ];


const rentPeriods:
  RentPeriod[] = [
    "monthly",
    "six_months",
    "yearly",
  ];


const propertyCategories:
  PropertyCategory[] = [
    "land",
    "house",
    "duplex",
    "commercial",
    "office",
    "warehouse",
  ];


const propertyConditions:
  PropertyCondition[] = [
    "new",
    "good",
    "renovation_required",
  ];


function numberValue(
  value: number | string | null,
): string {
  return value === null
    ? ""
    : String(value);
}


function parseOptionalNumber(
  value: string,
  label: string,
  options: {
    integer?: boolean;
  } = {},
): number | null {
  const cleaned =
    value.trim();

  if (!cleaned) {
    return null;
  }

  const parsed =
    Number(cleaned);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    throw new Error(
      `${label} must be a valid number of zero or more.`,
    );
  }

  if (
    options.integer &&
    !Number.isInteger(parsed)
  ) {
    throw new Error(
      `${label} must be a whole number.`,
    );
  }

  return parsed;
}


function listingMediaValue(
  item: Listing["media"][number],
): MediaValue {
  return {
    url: item.url,

    /*
     * The authenticated owner endpoint includes this value.
     * Keeping it prevents an existing Cloudinary asset from
     * losing its ownership reference when a draft is updated.
     */
    publicId:
      item.storage_public_id ??
      null,
  };
}


export default function PropertyListingForm({
  mode,
  listingId,
}: PropertyListingFormProps) {
  const router =
    useRouter();

  const submitLockRef =
    useRef(false);

  const isRental =
    mode === "rental";

  const [
    values,
    setValues,
  ] = useState<FormValues>(
    INITIAL_VALUES,
  );

  const [
    areas,
    setAreas,
  ] = useState<AreaRead[]>([]);

  const [
    campuses,
    setCampuses,
  ] = useState<CampusRead[]>([]);

  const [
    imageMedia,
    setImageMedia,
  ] = useState<MediaValue[]>([]);

  const [
    videoMedia,
    setVideoMedia,
  ] = useState<MediaValue[]>([]);

  const [
    loadingLocations,
    setLoadingLocations,
  ] = useState(true);

  const [
    locationError,
    setLocationError,
  ] = useState("");

  const [
    loadingDraft,
    setLoadingDraft,
  ] = useState(
    Boolean(listingId),
  );

  const [
    draftError,
    setDraftError,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const updateValue = <
    Key extends keyof FormValues,
  >(
    key: Key,
    value: FormValues[Key],
  ) => {
    setValues(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  };


  useEffect(() => {
    let active = true;

    const loadLocations =
      async () => {
        setLoadingLocations(true);
        setLocationError("");

        try {
          const [
            areaItems,
            campusItems,
          ] = await Promise.all([
            locationService.listAreas(),
            locationService.listCampuses(),
          ]);

          if (!active) {
            return;
          }

          setAreas(areaItems);
          setCampuses(campusItems);
        } catch (error) {
          if (!active) {
            return;
          }

          const message =
            getApiErrorMessage(
              error,
              "Location information could not be loaded.",
            );

          setLocationError(message);
          toast.error(message);
        } finally {
          if (active) {
            setLoadingLocations(false);
          }
        }
      };

    void loadLocations();

    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    if (!listingId) {
      setLoadingDraft(false);
      setDraftError("");

      return;
    }

    let active = true;

    const loadDraft =
      async () => {
        setLoadingDraft(true);
        setDraftError("");

        try {
          const draft =
            await listingService
              .getMineById(
                listingId,
              );

          if (!active) {
            return;
          }

          if (
            draft.listing_type !==
            mode
          ) {
            setDraftError(
              "This draft does not match this listing form.",
            );

            return;
          }

          if (
            draft.status !== "draft" &&
            draft.status !== "rejected"
          ) {
            setDraftError(
              "Only draft or rejected listings can be edited.",
            );

            return;
          }

          const commonValues = {
            ...INITIAL_VALUES,
            title: draft.title,
            description:
              draft.description,
            price:
              String(draft.price),
            areaId:
              draft.area.id,
            campusId:
              draft.campus?.id ??
              "",
          };

          if (isRental) {
            const details =
              draft.rental_details;

            if (!details) {
              setDraftError(
                "Rental details are missing from this draft.",
              );

              return;
            }

            setValues({
              ...commonValues,
              address:
                details.address,
              bedrooms:
                numberValue(
                  details.bedrooms,
                ),
              bathrooms:
                numberValue(
                  details.bathrooms,
                ),
              toilets:
                numberValue(
                  details.toilets,
                ),
              rentalCategory:
                details.category,
              rentPeriod:
                details.rent_period,
              furnished:
                details.is_furnished,
              cautionFee:
                numberValue(
                  details.caution_fee,
                ),
              serviceCharge:
                numberValue(
                  details.service_charge,
                ),
              distanceToCampus:
                numberValue(
                  details
                    .distance_to_campus_km,
                ),
            });
          } else {
            const details =
              draft
                .buy_property_details;

            if (!details) {
              setDraftError(
                "Property details are missing from this draft.",
              );

              return;
            }

            setValues({
              ...commonValues,
              address:
                details.address,
              bedrooms:
                numberValue(
                  details.bedrooms,
                ),
              bathrooms:
                numberValue(
                  details.bathrooms,
                ),
              toilets:
                numberValue(
                  details.toilets,
                ),
              propertyCategory:
                details.category,
              propertyCondition:
                details
                  .property_condition,
              landSize:
                numberValue(
                  details.land_size_sqm,
                ),
              titleDocument:
                details.title_document ??
                "",
            });
          }

          setImageMedia(
            draft.media
              .filter(
                (item) =>
                  item.media_type ===
                  "image",
              )
              .sort(
                (first, second) =>
                  first.sort_order -
                  second.sort_order,
              )
              .map(
                listingMediaValue,
              ),
          );

          setVideoMedia(
            draft.media
              .filter(
                (item) =>
                  item.media_type ===
                  "video",
              )
              .sort(
                (first, second) =>
                  first.sort_order -
                  second.sort_order,
              )
              .slice(0, 1)
              .map(
                listingMediaValue,
              ),
          );
        } catch (error) {
          if (!active) {
            return;
          }

          setDraftError(
            getApiErrorMessage(
              error,
              "This draft could not be loaded.",
            ),
          );
        } finally {
          if (active) {
            setLoadingDraft(false);
          }
        }
      };

    void loadDraft();

    return () => {
      active = false;
    };
  }, [
    isRental,
    listingId,
    mode,
  ]);


  const buildMedia =
    (): ListingMediaInput[] => {
      const media:
        ListingMediaInput[] =
          imageMedia.map(
            (item, index) => ({
              media_type: "image",
              url: item.url,
              storage_public_id:
                item.publicId,
              sort_order: index,
              is_cover:
                index === 0,
            }),
          );

      const video =
        videoMedia[0];

      if (video) {
        media.push({
          media_type: "video",
          url: video.url,
          storage_public_id:
            video.publicId,
          sort_order:
            media.length,
          is_cover: false,
        });
      }

      return media;
    };


  const validate = () => {
    const title =
      values.title.trim();

    const description =
      values.description.trim();

    const address =
      values.address.trim();

    const numericPrice =
      Number(values.price);

    if (title.length < 5) {
      throw new Error(
        "The listing title must contain at least 5 characters.",
      );
    }

    if (
      description.length < 30
    ) {
      throw new Error(
        "The description must contain at least 30 characters.",
      );
    }

    if (!values.areaId) {
      throw new Error(
        "Select the area where the property is located.",
      );
    }

    if (address.length < 5) {
      throw new Error(
        "Enter a clear property address or location description.",
      );
    }

    if (
      !Number.isFinite(
        numericPrice,
      ) ||
      numericPrice <= 0
    ) {
      throw new Error(
        "Price must be a valid amount greater than zero.",
      );
    }

    if (locationError) {
      throw new Error(
        "Location information is unavailable. Refresh the page and try again.",
      );
    }

    const bedrooms =
      parseOptionalNumber(
        values.bedrooms,
        "Bedrooms",
        {
          integer: true,
        },
      );

    const bathrooms =
      parseOptionalNumber(
        values.bathrooms,
        "Bathrooms",
        {
          integer: true,
        },
      );

    const toilets =
      parseOptionalNumber(
        values.toilets,
        "Toilets",
        {
          integer: true,
        },
      );

    if (isRental) {
      return {
        numericPrice,
        bedrooms,
        bathrooms,
        toilets,
        cautionFee:
          parseOptionalNumber(
            values.cautionFee,
            "Caution fee",
          ),
        serviceCharge:
          parseOptionalNumber(
            values.serviceCharge,
            "Service charge",
          ),
        distanceToCampus:
          parseOptionalNumber(
            values.distanceToCampus,
            "Distance to campus",
          ),
      };
    }

    return {
      numericPrice,
      bedrooms,
      bathrooms,
      toilets,
      landSize:
        parseOptionalNumber(
          values.landSize,
          "Land size",
        ),
    };
  };


  const submit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        submitLockRef.current ||
        submitting ||
        loadingLocations ||
        loadingDraft
      ) {
        return;
      }

      let validated:
        ReturnType<
          typeof validate
        >;

      try {
        validated =
          validate();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Review the listing information and try again.",
        );

        return;
      }

      submitLockRef.current =
        true;

      setSubmitting(true);

      try {
        const commonPayload = {
          area_id:
            values.areaId,
          campus_id:
            values.campusId ||
            null,
          title:
            values.title.trim(),
          description:
            values.description.trim(),
          price:
            validated.numericPrice,
          media:
            buildMedia(),
          address:
            values.address.trim(),
          bedrooms:
            validated.bedrooms,
          bathrooms:
            validated.bathrooms,
          toilets:
            validated.toilets,
        };

        if (isRental) {
          const rentalValues =
            validated as
              typeof validated & {
                cautionFee:
                  number | null;
                serviceCharge:
                  number | null;
                distanceToCampus:
                  number | null;
              };

          const payload:
            RentalCreatePayload = {
              ...commonPayload,
              category:
                values
                  .rentalCategory,
              rent_period:
                values.rentPeriod,
              is_furnished:
                values.furnished,
              caution_fee:
                rentalValues
                  .cautionFee,
              service_charge:
                rentalValues
                  .serviceCharge,
              distance_to_campus_km:
                rentalValues
                  .distanceToCampus,
            };

          if (listingId) {
            await listingService
              .updateRental(
                listingId,
                payload,
              );
          } else {
            await listingService
              .createRental(
                payload,
              );
          }
        } else {
          const propertyValues =
            validated as
              typeof validated & {
                landSize:
                  number | null;
              };

          const payload:
            BuyPropertyCreatePayload = {
              ...commonPayload,
              category:
                values
                  .propertyCategory,
              property_condition:
                values
                  .propertyCondition,
              land_size_sqm:
                propertyValues
                  .landSize,
              title_document:
                values.titleDocument
                  .trim() ||
                null,
            };

          if (listingId) {
            await listingService
              .updateBuyProperty(
                listingId,
                payload,
              );
          } else {
            await listingService
              .createBuyProperty(
                payload,
              );
          }
        }

        toast.success(
          listingId
            ? `${
                isRental
                  ? "Rental"
                  : "Property"
              } draft updated successfully.`
            : `${
                isRental
                  ? "Rental"
                  : "Property"
              } draft created successfully.`,
        );

        router.push(
          "/dashboard/listings",
        );

        router.refresh();
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            listingId
              ? "The draft could not be updated."
              : "The draft could not be created.",
          ),
        );
      } finally {
        submitLockRef.current =
          false;

        setSubmitting(false);
      }
    };


  const HeaderIcon =
    isRental
      ? Home
      : Building2;


  if (
    listingId &&
    loadingDraft
  ) {
    return (
      <div className={shared.page}>
        <div
          className={styles.formState}
          role="status"
          aria-live="polite"
        >
          <strong>
            Loading your draft…
          </strong>

          <span>
            Preparing the listing for editing.
          </span>
        </div>
      </div>
    );
  }


  if (
    listingId &&
    draftError
  ) {
    return (
      <div className={shared.page}>
        <div
          className={styles.formState}
          role="alert"
        >
          <strong>
            Draft unavailable
          </strong>

          <span>
            {draftError}
          </span>

          <button
            type="button"
            className={
              shared.primaryButton
            }
            onClick={() =>
              router.push(
                "/dashboard/listings",
              )
            }
          >
            Back to My listings
          </button>
        </div>
      </div>
    );
  }


  return (
    <form
      className={shared.page}
      onSubmit={submit}
      noValidate
    >
      <header
        className={
          shared.pageHeader
        }
      >
        <div>
          <span
            className={
              shared.eyebrow
            }
          >
            <HeaderIcon
              aria-hidden="true"
            />

            Agent workspace
          </span>

          <h1>
            {listingId
              ? `Edit your ${
                  isRental
                    ? "rental"
                    : "property"
                } draft.`
              : isRental
                ? "Create a rental listing."
                : "List a property for sale."}
          </h1>

          <p>
            {listingId
              ? "Update the information and media, save the draft, then submit it from My listings when it is ready."
              : "Present accurate information, a precise location and trustworthy media. Your draft can be reviewed before it is submitted to moderation."}
          </p>
        </div>
      </header>


      <section
        className={
          styles.formCard
        }
        aria-labelledby="listing-core-heading"
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <span aria-hidden="true">
            01
          </span>

          <div>
            <h2 id="listing-core-heading">
              Core information
            </h2>

            <p>
              Give the listing a clear identity and realistic price.
            </p>
          </div>
        </div>

        <div
          className={
            styles.twoColumns
          }
        >
          <label
            className={
              styles.full
            }
          >
            <span>
              Listing title
            </span>

            <input
              value={values.title}
              onChange={(event) =>
                updateValue(
                  "title",
                  event.target.value,
                )
              }
              placeholder={
                isRental
                  ? "e.g. Newly renovated self-contained room near Main Campus"
                  : "e.g. Registered full plot in a developed estate"
              }
              minLength={5}
              maxLength={220}
              autoComplete="off"
              disabled={submitting}
              required
            />

            <small>
              {values.title.length}/220
            </small>
          </label>

          <label>
            <span>
              Price (NGN)
            </span>

            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={values.price}
              onChange={(event) =>
                updateValue(
                  "price",
                  event.target.value,
                )
              }
              placeholder={
                isRental
                  ? "450000"
                  : "12500000"
              }
              disabled={submitting}
              required
            />
          </label>

          {isRental ? (
            <>
              <label>
                <span>
                  Rental category
                </span>

                <select
                  value={
                    values
                      .rentalCategory
                  }
                  onChange={(event) =>
                    updateValue(
                      "rentalCategory",
                      event.target
                        .value as RentalCategory,
                    )
                  }
                  disabled={submitting}
                >
                  {rentalCategories.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {titleCase(
                          category,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>
                  Rent period
                </span>

                <select
                  value={
                    values.rentPeriod
                  }
                  onChange={(event) =>
                    updateValue(
                      "rentPeriod",
                      event.target
                        .value as RentPeriod,
                    )
                  }
                  disabled={submitting}
                >
                  {rentPeriods.map(
                    (period) => (
                      <option
                        key={period}
                        value={period}
                      >
                        {titleCase(
                          period,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label
                className={
                  styles.checkbox
                }
              >
                <input
                  type="checkbox"
                  checked={
                    values.furnished
                  }
                  onChange={(event) =>
                    updateValue(
                      "furnished",
                      event.target.checked,
                    )
                  }
                  disabled={submitting}
                />

                <span>
                  Property is furnished
                </span>
              </label>
            </>
          ) : (
            <>
              <label>
                <span>
                  Property category
                </span>

                <select
                  value={
                    values
                      .propertyCategory
                  }
                  onChange={(event) =>
                    updateValue(
                      "propertyCategory",
                      event.target
                        .value as PropertyCategory,
                    )
                  }
                  disabled={submitting}
                >
                  {propertyCategories.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {titleCase(
                          category,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>
                  Property condition
                </span>

                <select
                  value={
                    values
                      .propertyCondition
                  }
                  onChange={(event) =>
                    updateValue(
                      "propertyCondition",
                      event.target
                        .value as PropertyCondition,
                    )
                  }
                  disabled={submitting}
                >
                  {propertyConditions.map(
                    (condition) => (
                      <option
                        key={condition}
                        value={condition}
                      >
                        {titleCase(
                          condition,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </>
          )}

          <label
            className={
              styles.full
            }
          >
            <span>
              Description
            </span>

            <textarea
              rows={8}
              value={
                values.description
              }
              onChange={(event) =>
                updateValue(
                  "description",
                  event.target.value,
                )
              }
              placeholder={
                "Describe the property, access, utilities, surrounding area, " +
                "condition and any important fees or documents…"
              }
              minLength={30}
              maxLength={12000}
              disabled={submitting}
              required
            />

            <small>
              {values.description.length}/12000 · minimum 30 characters
            </small>
          </label>
        </div>
      </section>


      <section
        className={
          styles.formCard
        }
        aria-labelledby="listing-location-heading"
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <span>
            <MapPin
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 id="listing-location-heading">
              Location and property details
            </h2>

            <p>
              Help users understand exactly where the property is and what it contains.
            </p>
          </div>
        </div>

        {locationError ? (
          <p
            className={
              styles.inlineError
            }
            role="alert"
          >
            {locationError}
          </p>
        ) : null}

        <div
          className={
            styles.twoColumns
          }
        >
          <label>
            <span>
              Area
            </span>

            <select
              value={
                values.areaId
              }
              onChange={(event) =>
                updateValue(
                  "areaId",
                  event.target.value,
                )
              }
              disabled={
                loadingLocations ||
                submitting
              }
              required
            >
              <option value="">
                {loadingLocations
                  ? "Loading areas…"
                  : "Select area"}
              </option>

              {areas.map(
                (area) => (
                  <option
                    key={area.id}
                    value={area.id}
                  >
                    {area.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>
              Nearest campus{" "}
              <small>
                optional
              </small>
            </span>

            <select
              value={
                values.campusId
              }
              onChange={(event) =>
                updateValue(
                  "campusId",
                  event.target.value,
                )
              }
              disabled={
                loadingLocations ||
                submitting
              }
            >
              <option value="">
                No specific campus
              </option>

              {campuses.map(
                (campus) => (
                  <option
                    key={campus.id}
                    value={campus.id}
                  >
                    {campus.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <label
            className={
              styles.full
            }
          >
            <span>
              Property address
            </span>

            <textarea
              rows={3}
              value={
                values.address
              }
              onChange={(event) =>
                updateValue(
                  "address",
                  event.target.value,
                )
              }
              placeholder="Street, landmark, estate or neighbourhood description"
              minLength={5}
              maxLength={2000}
              autoComplete="street-address"
              disabled={submitting}
              required
            />

            <small>
              {values.address.length}/2000
            </small>
          </label>

          <label>
            <span>
              Bedrooms{" "}
              <small>
                optional
              </small>
            </span>

            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={
                values.bedrooms
              }
              onChange={(event) =>
                updateValue(
                  "bedrooms",
                  event.target.value,
                )
              }
              disabled={submitting}
            />
          </label>

          <label>
            <span>
              Bathrooms{" "}
              <small>
                optional
              </small>
            </span>

            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={
                values.bathrooms
              }
              onChange={(event) =>
                updateValue(
                  "bathrooms",
                  event.target.value,
                )
              }
              disabled={submitting}
            />
          </label>

          <label>
            <span>
              Toilets{" "}
              <small>
                optional
              </small>
            </span>

            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={
                values.toilets
              }
              onChange={(event) =>
                updateValue(
                  "toilets",
                  event.target.value,
                )
              }
              disabled={submitting}
            />
          </label>

          {isRental ? (
            <>
              <label>
                <span>
                  Caution fee{" "}
                  <small>
                    optional
                  </small>
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={
                    values.cautionFee
                  }
                  onChange={(event) =>
                    updateValue(
                      "cautionFee",
                      event.target.value,
                    )
                  }
                  disabled={submitting}
                />
              </label>

              <label>
                <span>
                  Service charge{" "}
                  <small>
                    optional
                  </small>
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={
                    values.serviceCharge
                  }
                  onChange={(event) =>
                    updateValue(
                      "serviceCharge",
                      event.target.value,
                    )
                  }
                  disabled={submitting}
                />
              </label>

              <label>
                <span>
                  Distance to campus (km){" "}
                  <small>
                    optional
                  </small>
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={
                    values
                      .distanceToCampus
                  }
                  onChange={(event) =>
                    updateValue(
                      "distanceToCampus",
                      event.target.value,
                    )
                  }
                  disabled={submitting}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                <span>
                  Land size (sqm){" "}
                  <small>
                    optional
                  </small>
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={
                    values.landSize
                  }
                  onChange={(event) =>
                    updateValue(
                      "landSize",
                      event.target.value,
                    )
                  }
                  disabled={submitting}
                />
              </label>

              <label
                className={
                  styles.full
                }
              >
                <span>
                  Title document{" "}
                  <small>
                    optional
                  </small>
                </span>

                <input
                  value={
                    values
                      .titleDocument
                  }
                  onChange={(event) =>
                    updateValue(
                      "titleDocument",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Certificate of Occupancy, Deed of Assignment"
                  maxLength={180}
                  autoComplete="off"
                  disabled={submitting}
                />

                <small>
                  {values.titleDocument.length}/180
                </small>
              </label>
            </>
          )}
        </div>
      </section>


      <section
        className={
          styles.formCard
        }
        aria-labelledby="listing-media-heading"
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <span>
            <ImageIcon
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 id="listing-media-heading">
              Media
            </h2>

            <p>
              Upload clear, recent media that accurately represents the property.
            </p>
          </div>
        </div>

        <div
          className={
            styles.mediaStack
          }
        >
          <MediaUploader
            label="Property images"
            helperText={
              "Add up to eight clear exterior, interior and surrounding-area photos. " +
              "The first image becomes the cover."
            }
            value={imageMedia}
            onChange={
              setImageMedia
            }
            resourceType="image"
            scope="listings"
            accept="image/jpeg,image/png,image/webp,image/avif"
            maxFiles={8}
            maxBytes={
              5 *
              1024 *
              1024
            }
            disabled={submitting}
          />

          <MediaUploader
            label="Property video"
            helperText="Optional: one short walkthrough video, maximum 25 MB."
            value={videoMedia}
            onChange={
              setVideoMedia
            }
            resourceType="video"
            scope="listings"
            accept="video/mp4,video/webm,video/quicktime"
            maxFiles={1}
            maxBytes={
              25 *
              1024 *
              1024
            }
            disabled={submitting}
          />
        </div>
      </section>


      <aside
        className={
          styles.trustNote
        }
      >
        <ShieldCheck
          aria-hidden="true"
        />

        <div>
          <strong>
            Accuracy protects your approval rate.
          </strong>

          <p>
            HomeLink moderation may reject misleading prices, unclear ownership,
            duplicate listings or unverifiable property information.
          </p>
        </div>
      </aside>


      <div
        className={
          styles.submitBar
        }
      >
        <div>
          <strong>
            {listingId
              ? "Save draft changes"
              : "Create as draft"}
          </strong>

          <span>
            {listingId
              ? "Saving does not consume another posting credit."
              : "Review the draft in My listings before submitting it."}
          </span>
        </div>

        <button
          type="submit"
          className={
            shared.primaryButton
          }
          disabled={
            submitting ||
            loadingLocations ||
            Boolean(locationError)
          }
        >
          {submitting
            ? listingId
              ? "Saving draft…"
              : "Creating draft…"
            : listingId
              ? "Save draft"
              : `Create ${
                  isRental
                    ? "rental"
                    : "property"
                } draft`}
        </button>
      </div>
    </form>
  );
}