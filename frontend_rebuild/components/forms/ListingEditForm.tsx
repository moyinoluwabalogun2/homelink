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
  Image as ImageIcon,
  MapPin,
  Package,
  Save,
  ShieldCheck,
} from "lucide-react";

import { toast } from "sonner";

import MediaUploader from "@/components/media/MediaUploader";

import { getApiErrorMessage } from "@/lib/api-errors";
import { titleCase } from "@/lib/formatters";

import { listingService } from "@/services/listing-service";
import { locationService } from "@/services/location-service";

import type {
  AreaRead,
  CampusRead,
} from "@/types/location";

import type {
  MediaValue,
} from "@/types/media";

import type {
  BuyPropertyCreatePayload,
  ItemCondition,
  Listing,
  ListingMediaInput,
  MarketplaceCategory,
  MarketplaceCreatePayload,
  PropertyCategory,
  PropertyCondition,
  RentalCategory,
  RentalCreatePayload,
  RentPeriod,
} from "@/types/listing";

import styles from "./ListingEditForm.module.css";


interface ListingEditFormProps {
  listing: Listing;
}


interface FormState {
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

  marketplaceCategory: MarketplaceCategory;
  itemCondition: ItemCondition;
  negotiable: boolean;
}


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


const marketplaceCategories:
  MarketplaceCategory[] = [
    "phones",
    "laptops",
    "furniture",
    "electronics",
    "appliances",
    "fashion",
    "books",
    "gadgets",
    "services",
    "others",
  ];


const itemConditions:
  ItemCondition[] = [
    "new",
    "like_new",
    "used",
    "fair",
  ];


function stringValue(
  value:
    | number
    | string
    | null
    | undefined,
): string {
  return value === null ||
    value === undefined
    ? ""
    : String(value);
}


function parseOptionalNumber(
  value: string,
  label: string,
  options: {
    integer?: boolean;
    maximum?: number;
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

  if (
    options.maximum !== undefined &&
    parsed > options.maximum
  ) {
    throw new Error(
      `${label} cannot be greater than ${options.maximum}.`,
    );
  }

  return parsed;
}


function mediaValue(
  item: Listing["media"][number],
): MediaValue {
  return {
    url: item.url,
    publicId:
      item.storage_public_id ??
      null,
  };
}


function initialState(
  listing: Listing,
): FormState {
  const rental =
    listing.rental_details;

  const property =
    listing.buy_property_details;

  const marketplace =
    listing.marketplace_details;

  return {
    title:
      listing.title,

    description:
      listing.description,

    price:
      stringValue(
        listing.price,
      ),

    areaId:
      listing.area.id,

    campusId:
      listing.campus?.id ??
      "",

    address:
      rental?.address ??
      property?.address ??
      "",

    bedrooms:
      stringValue(
        rental?.bedrooms ??
        property?.bedrooms,
      ),

    bathrooms:
      stringValue(
        rental?.bathrooms ??
        property?.bathrooms,
      ),

    toilets:
      stringValue(
        rental?.toilets ??
        property?.toilets,
      ),

    rentalCategory:
      rental?.category ??
      "self_contain",

    rentPeriod:
      rental?.rent_period ??
      "yearly",

    furnished:
      rental?.is_furnished ??
      false,

    cautionFee:
      stringValue(
        rental?.caution_fee,
      ),

    serviceCharge:
      stringValue(
        rental?.service_charge,
      ),

    distanceToCampus:
      stringValue(
        rental
          ?.distance_to_campus_km,
      ),

    propertyCategory:
      property?.category ??
      "house",

    propertyCondition:
      property
        ?.property_condition ??
      "good",

    landSize:
      stringValue(
        property?.land_size_sqm,
      ),

    titleDocument:
      property?.title_document ??
      "",

    marketplaceCategory:
      marketplace?.category ??
      "others",

    itemCondition:
      marketplace?.condition ??
      "used",

    negotiable:
      marketplace
        ?.is_negotiable ??
      false,
  };
}


export default function ListingEditForm({
  listing,
}: ListingEditFormProps) {
  const router =
    useRouter();

  const submitLockRef =
    useRef(false);

  const isRental =
    listing.listing_type ===
    "rental";

  const isProperty =
    listing.listing_type ===
    "buy_property";

  const isMarketplace =
    listing.listing_type ===
    "marketplace";

  const [
    form,
    setForm,
  ] = useState<FormState>(
    () =>
      initialState(listing),
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
    loadingLocations,
    setLoadingLocations,
  ] = useState(true);

  const [
    locationError,
    setLocationError,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    imageMedia,
    setImageMedia,
  ] = useState<MediaValue[]>(
    () =>
      listing.media
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
        .map(mediaValue),
  );

  const [
    videoMedia,
    setVideoMedia,
  ] = useState<MediaValue[]>(
    () =>
      listing.media
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
        .map(mediaValue),
  );


  const update = <
    Key extends keyof FormState,
  >(
    key: Key,
    value: FormState[Key],
  ) => {
    setForm(
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
              "Locations could not be loaded.",
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


  const buildMedia =
    (): ListingMediaInput[] => {
      const media:
        ListingMediaInput[] =
          imageMedia.map(
            (item, index) => ({
              media_type:
                "image",

              url:
                item.url,

              storage_public_id:
                item.publicId,

              sort_order:
                index,

              is_cover:
                index === 0,
            }),
          );

      const video =
        videoMedia[0];

      if (video) {
        media.push({
          media_type:
            "video",

          url:
            video.url,

          storage_public_id:
            video.publicId,

          sort_order:
            media.length,

          is_cover:
            false,
        });
      }

      return media;
    };


  const validate = () => {
    const title =
      form.title.trim();

    const description =
      form.description.trim();

    const address =
      form.address.trim();

    const price =
      Number(form.price);

    if (title.length < 5) {
      throw new Error(
        "The title must contain at least 5 characters.",
      );
    }

    if (
      description.length < 30
    ) {
      throw new Error(
        "Add a clearer description of at least 30 characters.",
      );
    }

    if (!form.areaId) {
      throw new Error(
        "Select the area where the listing is located.",
      );
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      throw new Error(
        "Price must be a valid amount greater than zero.",
      );
    }

    if (
      !isMarketplace &&
      address.length < 5
    ) {
      throw new Error(
        "Enter a valid property address.",
      );
    }

    if (locationError) {
      throw new Error(
        "Locations are unavailable. Refresh the page and try again.",
      );
    }

    const bedrooms =
      parseOptionalNumber(
        form.bedrooms,
        "Bedrooms",
        {
          integer: true,
          maximum: 100,
        },
      );

    const bathrooms =
      parseOptionalNumber(
        form.bathrooms,
        "Bathrooms",
        {
          integer: true,
          maximum: 100,
        },
      );

    const toilets =
      parseOptionalNumber(
        form.toilets,
        "Toilets",
        {
          integer: true,
          maximum: 100,
        },
      );

    return {
      price,
      bedrooms,
      bathrooms,
      toilets,
    };
  };


  const save =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        submitLockRef.current ||
        submitting ||
        loadingLocations
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
            : "Review the listing details and try again.",
        );

        return;
      }

      submitLockRef.current =
        true;

      setSubmitting(true);

      try {
        const common = {
          area_id:
            form.areaId,

          campus_id:
            form.campusId ||
            null,

          title:
            form.title.trim(),

          description:
            form.description.trim(),

          price:
            validated.price,

          media:
            buildMedia(),
        };

        if (isRental) {
          const payload:
            RentalCreatePayload = {
              ...common,

              category:
                form.rentalCategory,

              rent_period:
                form.rentPeriod,

              bedrooms:
                validated.bedrooms,

              bathrooms:
                validated.bathrooms,

              toilets:
                validated.toilets,

              is_furnished:
                form.furnished,

              caution_fee:
                parseOptionalNumber(
                  form.cautionFee,
                  "Caution fee",
                ),

              service_charge:
                parseOptionalNumber(
                  form.serviceCharge,
                  "Service charge",
                ),

              distance_to_campus_km:
                parseOptionalNumber(
                  form.distanceToCampus,
                  "Distance to campus",
                ),

              address:
                form.address.trim(),
            };

          await listingService
            .updateRental(
              listing.id,
              payload,
            );
        } else if (isProperty) {
          const payload:
            BuyPropertyCreatePayload = {
              ...common,

              category:
                form.propertyCategory,

              property_condition:
                form.propertyCondition,

              bedrooms:
                validated.bedrooms,

              bathrooms:
                validated.bathrooms,

              toilets:
                validated.toilets,

              land_size_sqm:
                parseOptionalNumber(
                  form.landSize,
                  "Land size",
                ),

              title_document:
                form.titleDocument
                  .trim() ||
                null,

              address:
                form.address.trim(),
            };

          await listingService
            .updateBuyProperty(
              listing.id,
              payload,
            );
        } else {
          const payload:
            MarketplaceCreatePayload = {
              ...common,

              category:
                form
                  .marketplaceCategory,

              condition:
                form.itemCondition,

              is_negotiable:
                form.negotiable,
            };

          await listingService
            .updateMarketplace(
              listing.id,
              payload,
            );
        }

        toast.success(
          "Your changes were saved. No listing credit was used.",
        );

        router.push(
          "/dashboard/listings",
        );

        router.refresh();
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            "Your changes could not be saved.",
          ),
        );
      } finally {
        submitLockRef.current =
          false;

        setSubmitting(false);
      }
    };


  const typeLabel =
    isRental
      ? "Rental"
      : isProperty
        ? "Property for sale"
        : "Marketplace item";

  const TypeIcon =
    isMarketplace
      ? Package
      : Building2;


  return (
    <form
      className={styles.page}
      onSubmit={save}
      noValidate
    >
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <TypeIcon aria-hidden="true" />

            Edit {typeLabel}
          </span>

          <h1>
            Improve your listing.
          </h1>

          <p>
            Your existing information and media have been preserved.
            Saving this draft will not consume another credit.
          </p>
        </div>

        <span className={styles.status}>
          {titleCase(
            listing.status,
          )}
        </span>
      </header>


      {listing.status === "rejected" &&
      listing.rejection_reason ? (
        <aside
          className={styles.rejection}
          role="status"
        >
          <ShieldCheck
            aria-hidden="true"
          />

          <div>
            <strong>
              Changes requested
            </strong>

            <p>
              {listing.rejection_reason}
            </p>

            <span>
              Saving your correction returns this listing to Draft.
              You can review it before submitting again.
            </span>
          </div>
        </aside>
      ) : null}


      <section
        className={styles.card}
        aria-labelledby="edit-core-heading"
      >
        <div className={styles.sectionHeading}>
          <span aria-hidden="true">
            01
          </span>

          <div>
            <h2 id="edit-core-heading">
              Core information
            </h2>

            <p>
              Keep the title specific and make the description easy to trust.
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          <label className={styles.full}>
            <span>
              Listing title
            </span>

            <input
              value={form.title}
              onChange={(event) =>
                update(
                  "title",
                  event.target.value,
                )
              }
              minLength={5}
              maxLength={220}
              autoComplete="off"
              disabled={submitting}
              placeholder="Enter a clear listing title"
              required
            />

            <small>
              {form.title.length}/220
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
              value={form.price}
              onChange={(event) =>
                update(
                  "price",
                  event.target.value,
                )
              }
              disabled={submitting}
              placeholder="0"
              required
            />
          </label>

          <label>
            <span>
              Listing type
            </span>

            <input
              value={typeLabel}
              disabled
              aria-readonly="true"
            />
          </label>

          <label className={styles.full}>
            <span>
              Description
            </span>

            <textarea
              value={
                form.description
              }
              onChange={(event) =>
                update(
                  "description",
                  event.target.value,
                )
              }
              minLength={30}
              maxLength={12000}
              disabled={submitting}
              placeholder="Describe the listing accurately"
              required
            />

            <small>
              {form.description.length}/12000 · minimum 30 characters
            </small>
          </label>
        </div>
      </section>


      <section
        className={styles.card}
        aria-labelledby="edit-location-heading"
      >
        <div className={styles.sectionHeading}>
          <span>
            <MapPin aria-hidden="true" />
          </span>

          <div>
            <h2 id="edit-location-heading">
              Location
            </h2>

            <p>
              Select the correct area and nearest campus.
            </p>
          </div>
        </div>

        {locationError ? (
          <p
            className={styles.inlineError}
            role="alert"
          >
            {locationError}
          </p>
        ) : null}

        <div className={styles.grid}>
          <label>
            <span>
              Area
            </span>

            <select
              value={form.areaId}
              onChange={(event) =>
                update(
                  "areaId",
                  event.target.value,
                )
              }
              disabled={
                submitting ||
                loadingLocations
              }
              required
            >
              <option value="">
                {loadingLocations
                  ? "Loading areas…"
                  : "Select an area"}
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
                Optional
              </small>
            </span>

            <select
              value={form.campusId}
              onChange={(event) =>
                update(
                  "campusId",
                  event.target.value,
                )
              }
              disabled={
                submitting ||
                loadingLocations
              }
            >
              <option value="">
                No campus selected
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

          {!isMarketplace ? (
            <label className={styles.full}>
              <span>
                Property address
              </span>

              <textarea
                rows={3}
                value={form.address}
                onChange={(event) =>
                  update(
                    "address",
                    event.target.value,
                  )
                }
                minLength={5}
                maxLength={2000}
                autoComplete="street-address"
                disabled={submitting}
                placeholder="Enter the property address"
                required
              />

              <small>
                {form.address.length}/2000
              </small>
            </label>
          ) : null}
        </div>
      </section>


      {isRental ? (
        <section
          className={styles.card}
          aria-labelledby="edit-rental-heading"
        >
          <div className={styles.sectionHeading}>
            <span aria-hidden="true">
              03
            </span>

            <div>
              <h2 id="edit-rental-heading">
                Rental details
              </h2>

              <p>
                Update the rent structure, room information and charges.
              </p>
            </div>
          </div>

          <div className={styles.grid}>
            <label>
              <span>
                Category
              </span>

              <select
                value={
                  form.rentalCategory
                }
                onChange={(event) =>
                  update(
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
                  form.rentPeriod
                }
                onChange={(event) =>
                  update(
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

            <NumberField
              label="Bedrooms"
              value={form.bedrooms}
              onChange={(value) =>
                update(
                  "bedrooms",
                  value,
                )
              }
              disabled={submitting}
              integer
            />

            <NumberField
              label="Bathrooms"
              value={form.bathrooms}
              onChange={(value) =>
                update(
                  "bathrooms",
                  value,
                )
              }
              disabled={submitting}
              integer
            />

            <NumberField
              label="Toilets"
              value={form.toilets}
              onChange={(value) =>
                update(
                  "toilets",
                  value,
                )
              }
              disabled={submitting}
              integer
            />

            <NumberField
              label="Caution fee"
              value={form.cautionFee}
              onChange={(value) =>
                update(
                  "cautionFee",
                  value,
                )
              }
              disabled={submitting}
            />

            <NumberField
              label="Service charge"
              value={form.serviceCharge}
              onChange={(value) =>
                update(
                  "serviceCharge",
                  value,
                )
              }
              disabled={submitting}
            />

            <NumberField
              label="Distance to campus"
              detail="km"
              value={
                form.distanceToCampus
              }
              onChange={(value) =>
                update(
                  "distanceToCampus",
                  value,
                )
              }
              disabled={submitting}
              step="0.1"
            />

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.furnished}
                onChange={(event) =>
                  update(
                    "furnished",
                    event.target.checked,
                  )
                }
                disabled={submitting}
              />

              <span>
                This rental is furnished
              </span>
            </label>
          </div>
        </section>
      ) : null}


      {isProperty ? (
        <section
          className={styles.card}
          aria-labelledby="edit-property-heading"
        >
          <div className={styles.sectionHeading}>
            <span aria-hidden="true">
              03
            </span>

            <div>
              <h2 id="edit-property-heading">
                Property details
              </h2>

              <p>
                Update the property condition, dimensions and documentation.
              </p>
            </div>
          </div>

          <div className={styles.grid}>
            <label>
              <span>
                Category
              </span>

              <select
                value={
                  form.propertyCategory
                }
                onChange={(event) =>
                  update(
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
                Condition
              </span>

              <select
                value={
                  form.propertyCondition
                }
                onChange={(event) =>
                  update(
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

            <NumberField
              label="Bedrooms"
              value={form.bedrooms}
              onChange={(value) =>
                update(
                  "bedrooms",
                  value,
                )
              }
              disabled={submitting}
              integer
            />

            <NumberField
              label="Bathrooms"
              value={form.bathrooms}
              onChange={(value) =>
                update(
                  "bathrooms",
                  value,
                )
              }
              disabled={submitting}
              integer
            />

            <NumberField
              label="Toilets"
              value={form.toilets}
              onChange={(value) =>
                update(
                  "toilets",
                  value,
                )
              }
              disabled={submitting}
              integer
            />

            <NumberField
              label="Land size"
              detail="sqm"
              value={form.landSize}
              onChange={(value) =>
                update(
                  "landSize",
                  value,
                )
              }
              disabled={submitting}
              step="0.01"
            />

            <label className={styles.full}>
              <span>
                Title document{" "}
                <small>
                  Optional
                </small>
              </span>

              <input
                value={
                  form.titleDocument
                }
                onChange={(event) =>
                  update(
                    "titleDocument",
                    event.target.value,
                  )
                }
                maxLength={180}
                disabled={submitting}
                placeholder="For example: Deed of Assignment"
              />

              <small>
                {form.titleDocument.length}/180
              </small>
            </label>
          </div>
        </section>
      ) : null}


      {isMarketplace ? (
        <section
          className={styles.card}
          aria-labelledby="edit-item-heading"
        >
          <div className={styles.sectionHeading}>
            <span aria-hidden="true">
              03
            </span>

            <div>
              <h2 id="edit-item-heading">
                Item details
              </h2>

              <p>
                Keep the category and condition honest and easy to understand.
              </p>
            </div>
          </div>

          <div className={styles.grid}>
            <label>
              <span>
                Category
              </span>

              <select
                value={
                  form
                    .marketplaceCategory
                }
                onChange={(event) =>
                  update(
                    "marketplaceCategory",
                    event.target
                      .value as MarketplaceCategory,
                  )
                }
                disabled={submitting}
              >
                {marketplaceCategories.map(
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
                Condition
              </span>

              <select
                value={
                  form.itemCondition
                }
                onChange={(event) =>
                  update(
                    "itemCondition",
                    event.target
                      .value as ItemCondition,
                  )
                }
                disabled={submitting}
              >
                {itemConditions.map(
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

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={
                  form.negotiable
                }
                onChange={(event) =>
                  update(
                    "negotiable",
                    event.target.checked,
                  )
                }
                disabled={submitting}
              />

              <span>
                Price is negotiable
              </span>
            </label>
          </div>
        </section>
      ) : null}


      <section
        className={styles.card}
        aria-labelledby="edit-media-heading"
      >
        <div className={styles.sectionHeading}>
          <span>
            <ImageIcon aria-hidden="true" />
          </span>

          <div>
            <h2 id="edit-media-heading">
              Listing media
            </h2>

            <p>
              Existing uploads remain available. Remove only the files you no longer need.
            </p>
          </div>
        </div>

        <div className={styles.mediaStack}>
          <MediaUploader
            label={
              isMarketplace
                ? "Item images"
                : "Property images"
            }
            helperText={
              isMarketplace
                ? "Add up to five clear images. The first image becomes the cover."
                : "Add up to eight clear images. The first image becomes the cover."
            }
            value={imageMedia}
            onChange={setImageMedia}
            resourceType="image"
            scope="listings"
            accept="image/jpeg,image/png,image/webp,image/avif"
            maxFiles={
              isMarketplace
                ? 5
                : 8
            }
            maxBytes={
              5 *
              1024 *
              1024
            }
            disabled={submitting}
          />

          <MediaUploader
            label="Listing video"
            helperText="Optional: one short video, maximum 25 MB."
            value={videoMedia}
            onChange={setVideoMedia}
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


      <aside className={styles.trustNote}>
        <ShieldCheck aria-hidden="true" />

        <div>
          <strong>
            Editing does not consume a credit.
          </strong>

          <p>
            Credits are checked only when a listing is submitted under
            the HomeLink allowance and payment rules. Saving corrections
            keeps this listing as a draft.
          </p>
        </div>
      </aside>


      <div className={styles.saveBar}>
        <div>
          <strong>
            Ready to save?
          </strong>

          <span>
            You can review the draft again before submitting it.
          </span>
        </div>

        <div className={styles.saveActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() =>
              router.push(
                "/dashboard/listings",
              )
            }
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className={styles.saveButton}
            disabled={
              submitting ||
              loadingLocations ||
              Boolean(locationError)
            }
          >
            <Save aria-hidden="true" />

            {submitting
              ? "Saving…"
              : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}


interface NumberFieldProps {
  label: string;
  detail?: string;
  value: string;
  disabled: boolean;
  integer?: boolean;
  step?: string;
  onChange: (
    value: string,
  ) => void;
}


function NumberField({
  label,
  detail,
  value,
  disabled,
  integer = false,
  step,
  onChange,
}: NumberFieldProps) {
  return (
    <label>
      <span>
        {label}

        {detail ? (
          <small>
            {" "}
            {detail}
          </small>
        ) : null}
      </span>

      <input
        type="number"
        min="0"
        max={
          integer
            ? "100"
            : undefined
        }
        step={
          step ??
          (integer
            ? "1"
            : "1")
        }
        inputMode={
          integer
            ? "numeric"
            : "decimal"
        }
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        disabled={disabled}
      />
    </label>
  );
}