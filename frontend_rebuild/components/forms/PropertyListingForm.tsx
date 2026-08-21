"use client";

import { useEffect, useState } from "react";
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
import type { MediaValue } from "@/types/media";
import type {
  BuyPropertyCreatePayload,
  ListingMediaInput,
  PropertyCategory,
  PropertyCondition,
  RentalCategory,
  RentalCreatePayload,
  RentPeriod,
} from "@/types/listing";
import type { AreaRead, CampusRead } from "@/types/location";

import styles from "./PropertyListingForm.module.css";

type FormMode = "rental" | "buy_property";

interface PropertyListingFormProps {
  mode: FormMode;
}

const rentalCategories: RentalCategory[] = [
  "hostel",
  "single_room",
  "self_contain",
  "shared_apartment",
  "mini_flat",
  "flat",
  "duplex",
];

const rentPeriods: RentPeriod[] = ["monthly", "six_months", "yearly"];

const propertyCategories: PropertyCategory[] = [
  "land",
  "house",
  "duplex",
  "commercial",
  "office",
  "warehouse",
];

const propertyConditions: PropertyCondition[] = [
  "new",
  "good",
  "renovation_required",
];

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function PropertyListingForm({
  mode,
}: PropertyListingFormProps) {
  const router = useRouter();
  const isRental = mode === "rental";

  const [areas, setAreas] = useState<AreaRead[]>([]);
  const [campuses, setCampuses] = useState<CampusRead[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [areaId, setAreaId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [address, setAddress] = useState("");

  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [toilets, setToilets] = useState("");

  const [rentalCategory, setRentalCategory] =
    useState<RentalCategory>("self_contain");
  const [rentPeriod, setRentPeriod] = useState<RentPeriod>("yearly");
  const [furnished, setFurnished] = useState(false);
  const [cautionFee, setCautionFee] = useState("");
  const [serviceCharge, setServiceCharge] = useState("");
  const [distanceToCampus, setDistanceToCampus] = useState("");

  const [propertyCategory, setPropertyCategory] =
    useState<PropertyCategory>("house");
  const [propertyCondition, setPropertyCondition] =
    useState<PropertyCondition>("good");
  const [landSize, setLandSize] = useState("");
  const [titleDocument, setTitleDocument] = useState("");

  const [imageMedia, setImageMedia] = useState<MediaValue[]>([]);
const [videoMedia, setVideoMedia] = useState<MediaValue[]>([]);

  useEffect(() => {
    Promise.all([
      locationService.listAreas(),
      locationService.listCampuses(),
    ])
      .then(([areaItems, campusItems]) => {
        setAreas(areaItems);
        setCampuses(campusItems);
      })
      .catch((reason) => {
        toast.error(getApiErrorMessage(reason));
      })
      .finally(() => setLoadingLocations(false));
  }, []);

const buildMedia = (): ListingMediaInput[] => {
  const media: ListingMediaInput[] =
    imageMedia.map((item, index) => ({
      media_type: "image",
      url: item.url,
      storage_public_id: item.publicId,
      sort_order: index,
      is_cover: index === 0,
    }));

  if (videoMedia[0]) {
    media.push({
      media_type: "video",
      url: videoMedia[0].url,
      storage_public_id: videoMedia[0].publicId,
      sort_order: media.length,
      is_cover: false,
    });
  }

  return media;
};

  const validate = (): boolean => {
    const numericPrice = Number(price);

    if (
      title.trim().length < 5 ||
      description.trim().length < 30 ||
      address.trim().length < 5 ||
      !areaId ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      toast.error(
        "Add a clear title, detailed description, address, area and valid price.",
      );
      return false;
    }

    return true;
  };

  const submit = async () => {
    if (!validate()) return;

    setSubmitting(true);

    try {
      if (isRental) {
        const payload: RentalCreatePayload = {
          area_id: areaId,
          campus_id: campusId || null,
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          media: buildMedia(),
          category: rentalCategory,
          rent_period: rentPeriod,
          bedrooms: optionalNumber(bedrooms),
          bathrooms: optionalNumber(bathrooms),
          toilets: optionalNumber(toilets),
          is_furnished: furnished,
          caution_fee: optionalNumber(cautionFee),
          service_charge: optionalNumber(serviceCharge),
          distance_to_campus_km: optionalNumber(distanceToCampus),
          address: address.trim(),
        };

        await listingService.createRental(payload);
      } else {
        const payload: BuyPropertyCreatePayload = {
          area_id: areaId,
          campus_id: campusId || null,
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          media: buildMedia(),
          category: propertyCategory,
          property_condition: propertyCondition,
          bedrooms: optionalNumber(bedrooms),
          bathrooms: optionalNumber(bathrooms),
          toilets: optionalNumber(toilets),
          land_size_sqm: optionalNumber(landSize),
          title_document: titleDocument.trim() || null,
          address: address.trim(),
        };

        await listingService.createBuyProperty(payload);
      }

      toast.success(
        `${isRental ? "Rental" : "Property"} draft created successfully.`,
      );
      router.push("/dashboard/listings");
    } catch (reason) {
      toast.error(getApiErrorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  };

  const HeaderIcon = isRental ? Home : Building2;

  return (
    <div className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <span className={shared.eyebrow}>
            <HeaderIcon aria-hidden="true" />
            Agent workspace
          </span>
          <h1>
            {isRental
              ? "Create a rental listing."
              : "List a property for sale."}
          </h1>
          <p>
            Present accurate information, a precise location and trustworthy media.
            Your draft can be reviewed before it is submitted to moderation.
          </p>
        </div>
      </header>

      <section className={styles.formCard}>
        <div className={styles.sectionHeading}>
          <span>01</span>
          <div>
            <h2>Core information</h2>
            <p>Give the listing a clear identity and realistic price.</p>
          </div>
        </div>

        <div className={styles.twoColumns}>
          <label className={styles.full}>
            <span>Listing title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                isRental
                  ? "e.g. Newly renovated self-contained room near Main Campus"
                  : "e.g. Registered full plot in a developed estate"
              }
              maxLength={220}
            />
          </label>

          <label>
            <span>Price (NGN)</span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder={isRental ? "450000" : "12500000"}
            />
          </label>

          {isRental ? (
            <>
              <label>
                <span>Rental category</span>
                <select
                  value={rentalCategory}
                  onChange={(event) =>
                    setRentalCategory(event.target.value as RentalCategory)
                  }
                >
                  {rentalCategories.map((category) => (
                    <option key={category} value={category}>
                      {titleCase(category)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Rent period</span>
                <select
                  value={rentPeriod}
                  onChange={(event) =>
                    setRentPeriod(event.target.value as RentPeriod)
                  }
                >
                  {rentPeriods.map((period) => (
                    <option key={period} value={period}>
                      {titleCase(period)}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={furnished}
                  onChange={(event) => setFurnished(event.target.checked)}
                />
                <span>Property is furnished</span>
              </label>
            </>
          ) : (
            <>
              <label>
                <span>Property category</span>
                <select
                  value={propertyCategory}
                  onChange={(event) =>
                    setPropertyCategory(event.target.value as PropertyCategory)
                  }
                >
                  {propertyCategories.map((category) => (
                    <option key={category} value={category}>
                      {titleCase(category)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Property condition</span>
                <select
                  value={propertyCondition}
                  onChange={(event) =>
                    setPropertyCondition(event.target.value as PropertyCondition)
                  }
                >
                  {propertyConditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {titleCase(condition)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className={styles.full}>
            <span>Description</span>
            <textarea
              rows={8}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={
                "Describe the property, access, utilities, surrounding area, " +
                "condition and any important fees or documents…"
              }
              maxLength={12000}
            />
            <small>{description.length}/12000 · minimum 30 characters</small>
          </label>
        </div>
      </section>

      <section className={styles.formCard}>
        <div className={styles.sectionHeading}>
          <span>
            <MapPin aria-hidden="true" />
          </span>
          <div>
            <h2>Location and property details</h2>
            <p>
              Help users understand exactly where the property is and what it
              contains.
            </p>
          </div>
        </div>

        <div className={styles.twoColumns}>
          <label>
            <span>Area</span>
            <select
              value={areaId}
              onChange={(event) => setAreaId(event.target.value)}
              disabled={loadingLocations}
            >
              <option value="">Select area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Nearest campus <small>optional</small></span>
            <select
              value={campusId}
              onChange={(event) => setCampusId(event.target.value)}
              disabled={loadingLocations}
            >
              <option value="">No specific campus</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.full}>
            <span>Property address</span>
            <textarea
              rows={3}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Street, landmark, estate or neighbourhood description"
              maxLength={2000}
            />
          </label>

          <label>
            <span>Bedrooms <small>optional</small></span>
            <input
              type="number"
              min="0"
              value={bedrooms}
              onChange={(event) => setBedrooms(event.target.value)}
            />
          </label>

          <label>
            <span>Bathrooms <small>optional</small></span>
            <input
              type="number"
              min="0"
              value={bathrooms}
              onChange={(event) => setBathrooms(event.target.value)}
            />
          </label>

          <label>
            <span>Toilets <small>optional</small></span>
            <input
              type="number"
              min="0"
              value={toilets}
              onChange={(event) => setToilets(event.target.value)}
            />
          </label>

          {isRental ? (
            <>
              <label>
                <span>Caution fee <small>optional</small></span>
                <input
                  type="number"
                  min="0"
                  value={cautionFee}
                  onChange={(event) => setCautionFee(event.target.value)}
                />
              </label>

              <label>
                <span>Service charge <small>optional</small></span>
                <input
                  type="number"
                  min="0"
                  value={serviceCharge}
                  onChange={(event) => setServiceCharge(event.target.value)}
                />
              </label>

              <label>
                <span>Distance to campus (km) <small>optional</small></span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={distanceToCampus}
                  onChange={(event) => setDistanceToCampus(event.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                <span>Land size (sqm) <small>optional</small></span>
                <input
                  type="number"
                  min="0"
                  value={landSize}
                  onChange={(event) => setLandSize(event.target.value)}
                />
              </label>

              <label className={styles.full}>
                <span>Title document <small>optional</small></span>
                <input
                  value={titleDocument}
                  onChange={(event) => setTitleDocument(event.target.value)}
                  placeholder="e.g. Certificate of Occupancy, Deed of Assignment"
                  maxLength={180}
                />
              </label>
            </>
          )}
        </div>
      </section>

      <section className={styles.formCard}>
        <div className={styles.sectionHeading}>
          <span>
            <ImageIcon aria-hidden="true" />
          </span>

          <div>
            <h2>Media</h2>
            <p>
              Upload directly when Cloudinary is enabled, or paste public URLs
              while testing locally.
            </p>
          </div>
        </div>

        <div className={styles.mediaStack}>
          <MediaUploader
  label="Property images"
  helperText={
    "Add up to eight clear exterior, interior and surrounding-area photos. " +
    "The first image becomes the cover."
  }
  value={imageMedia}
  onChange={setImageMedia}
  resourceType="image"
  scope="listings"
  accept="image/jpeg,image/png,image/webp,image/avif"
  maxFiles={8}
  maxBytes={5 * 1024 * 1024}
  disabled={submitting}
/>

<MediaUploader
  label="Property video"
  helperText="Optional: one short walkthrough video, maximum 25 MB."
  value={videoMedia}
  onChange={setVideoMedia}
  resourceType="video"
  scope="listings"
  accept="video/mp4,video/webm,video/quicktime"
  maxFiles={1}
  maxBytes={25 * 1024 * 1024}
  disabled={submitting}
/>
        </div>
      </section>

      <aside className={styles.trustNote}>
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Accuracy protects your approval rate.</strong>
          <p>
            HomeLink moderation may reject misleading prices, unclear ownership,
            duplicate listings or unverifiable property information.
          </p>
        </div>
      </aside>

      <div className={styles.submitBar}>
        <div>
          <strong>Create as draft</strong>
          <span>Review the draft in My listings before submitting it.</span>
        </div>
        <button
          type="button"
          className={shared.primaryButton}
          disabled={submitting}
          onClick={() => void submit()}
        >
          {submitting
            ? "Creating draft…"
            : `Create ${isRental ? "rental" : "property"} draft`}
        </button>
      </div>
    </div>
  );
}