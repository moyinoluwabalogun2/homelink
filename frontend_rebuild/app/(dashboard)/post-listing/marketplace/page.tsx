"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import shared from "@/components/dashboard/DashboardPage.module.css";
import MediaUploader from "@/components/media/MediaUploader";
import { getApiErrorMessage } from "@/lib/api-errors";
import { titleCase } from "@/lib/formatters";
import { listingService } from "@/services/listing-service";
import { locationService } from "@/services/location-service";

import type {
  ItemCondition,
  ListingMediaInput,
  MarketplaceCategory,
} from "@/types/listing";

import type {
  AreaRead,
  CampusRead,
} from "@/types/location";

import styles from "./page.module.css";


const categories: MarketplaceCategory[] = [
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


const conditions: ItemCondition[] = [
  "new",
  "like_new",
  "used",
  "fair",
];


export default function MarketplaceListingPage() {
  const router = useRouter();

  const [areas, setAreas] =
    useState<AreaRead[]>([]);

  const [campuses, setCampuses] =
    useState<CampusRead[]>([]);

  const [
    loadingLocations,
    setLoadingLocations,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [price, setPrice] =
    useState("");

  const [areaId, setAreaId] =
    useState("");

  const [campusId, setCampusId] =
    useState("");

  const [
    category,
    setCategory,
  ] = useState<MarketplaceCategory>(
    "phones",
  );

  const [
    condition,
    setCondition,
  ] = useState<ItemCondition>(
    "used",
  );

  const [
    negotiable,
    setNegotiable,
  ] = useState(false);

  const [
    imageUrls,
    setImageUrls,
  ] = useState<string[]>([]);

  const [
    videoUrls,
    setVideoUrls,
  ] = useState<string[]>([]);


  useEffect(() => {
    Promise.all([
      locationService.listAreas(),
      locationService.listCampuses(),
    ])
      .then(
        ([
          areaItems,
          campusItems,
        ]) => {
          setAreas(areaItems);
          setCampuses(campusItems);
        },
      )
      .catch((reason) => {
        toast.error(
          getApiErrorMessage(reason),
        );
      })
      .finally(() => {
        setLoadingLocations(false);
      });
  }, []);


  const buildMedia =
    (): ListingMediaInput[] => {
      const media:
        ListingMediaInput[] =
        imageUrls.map(
          (
            url,
            index,
          ) => ({
            media_type: "image",
            url,
            sort_order: index,
            is_cover:
              index === 0,
          }),
        );

      if (videoUrls[0]) {
        media.push({
          media_type: "video",
          url: videoUrls[0],
          sort_order:
            media.length,
          is_cover: false,
        });
      }

      return media;
    };


  const submit = async () => {
    const numericPrice =
      Number(price);

    if (
      title.trim().length < 5 ||
      description.trim().length < 30 ||
      !areaId ||
      !Number.isFinite(
        numericPrice,
      ) ||
      numericPrice < 0
    ) {
      toast.error(
        "Add a title, detailed description, area and valid price.",
      );

      return;
    }


    if (
      imageUrls.length === 0
    ) {
      toast.error(
        "Add at least one image before creating the listing.",
      );

      return;
    }


    setSubmitting(true);

    try {
      await listingService
        .createMarketplace({
          area_id: areaId,

          campus_id:
            campusId || null,

          title:
            title.trim(),

          description:
            description.trim(),

          price:
            numericPrice,

          media:
            buildMedia(),

          category,

          condition,

          is_negotiable:
            negotiable,
        });


      toast.success(
        "Marketplace draft created. Review it in My listings before submitting it.",
      );

      router.push(
        "/dashboard/listings",
      );
    } catch (reason) {
      toast.error(
        getApiErrorMessage(
          reason,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div
      className={shared.page}
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
            <Store
              aria-hidden="true"
            />

            Marketplace
          </span>

          <h1>
            Post a student item.
          </h1>

          <p>
            Use a clear title,
            honest condition
            details and sharp
            images to make your
            listing easier to
            trust.
          </p>
        </div>
      </header>


      <section
        className={
          styles.formCard
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <span>01</span>

          <div>
            <h2>
              Item information
            </h2>

            <p>
              Describe exactly
              what you are
              offering.
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
              value={title}
              onChange={(
                event,
              ) =>
                setTitle(
                  event.target
                    .value,
                )
              }
              placeholder="e.g. Clean iPhone 12, 128GB"
              maxLength={220}
            />
          </label>


          <label>
            <span>
              Category
            </span>

            <select
              value={category}
              onChange={(
                event,
              ) =>
                setCategory(
                  event.target
                    .value as MarketplaceCategory,
                )
              }
            >
              {categories.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {titleCase(
                      item,
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
              value={condition}
              onChange={(
                event,
              ) =>
                setCondition(
                  event.target
                    .value as ItemCondition,
                )
              }
            >
              {conditions.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {titleCase(
                      item,
                    )}
                  </option>
                ),
              )}
            </select>
          </label>


          <label>
            <span>
              Price (NGN)
            </span>

            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={price}
              onChange={(
                event,
              ) =>
                setPrice(
                  event.target
                    .value,
                )
              }
              placeholder="150000"
            />
          </label>


          <label
            className={
              styles.checkbox
            }
          >
            <input
              type="checkbox"
              checked={
                negotiable
              }
              onChange={(
                event,
              ) =>
                setNegotiable(
                  event.target
                    .checked,
                )
              }
            />

            <span>
              Price is negotiable
            </span>
          </label>


          <label
            className={
              styles.full
            }
          >
            <span>
              Description
            </span>

            <textarea
              rows={7}
              value={
                description
              }
              onChange={(
                event,
              ) =>
                setDescription(
                  event.target
                    .value,
                )
              }
              placeholder="Describe the condition, included accessories, known faults and pickup arrangement…"
              maxLength={
                12000
              }
            />

            <small>
              {
                description.length
              }
              /12000 · minimum
              30 characters
            </small>
          </label>
        </div>
      </section>


      <section
        className={
          styles.formCard
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <span>02</span>

          <div>
            <h2>
              Location
            </h2>

            <p>
              Help nearby students
              find the item.
            </p>
          </div>
        </div>


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
              value={areaId}
              onChange={(
                event,
              ) =>
                setAreaId(
                  event.target
                    .value,
                )
              }
              disabled={
                loadingLocations
              }
            >
              <option value="">
                Select area
              </option>

              {areas.map(
                (area) => (
                  <option
                    key={area.id}
                    value={
                      area.id
                    }
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
              value={campusId}
              onChange={(
                event,
              ) =>
                setCampusId(
                  event.target
                    .value,
                )
              }
              disabled={
                loadingLocations
              }
            >
              <option value="">
                No specific campus
              </option>

              {campuses.map(
                (campus) => (
                  <option
                    key={
                      campus.id
                    }
                    value={
                      campus.id
                    }
                  >
                    {
                      campus.name
                    }
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      </section>


      <section
        className={
          styles.formCard
        }
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
            <h2>
              Photos and video
            </h2>

            <p>
              Upload your media
              directly to
              HomeLink.
            </p>
          </div>
        </div>


        <div
          className={
            styles.mediaStack
          }
        >
          <MediaUploader
            label="Item images"
            helperText="Add up to five clear photos. The first photo becomes the cover image."
            value={
              imageUrls
            }
            onChange={
              setImageUrls
            }
            resourceType="image"
            scope="listings"
            accept="image/jpeg,image/png,image/webp,image/avif"
            maxFiles={5}
            maxBytes={
              5 *
              1024 *
              1024
            }
            disabled={
              submitting
            }
          />


          <MediaUploader
            label="Item video"
            helperText="Optional: one short video, maximum 5 MB."
            value={
              videoUrls
            }
            onChange={
              setVideoUrls
            }
            resourceType="video"
            scope="listings"
            accept="video/mp4,video/webm,video/quicktime"
            maxFiles={1}
            maxBytes={
              5 *
              1024 *
              1024
            }
            disabled={
              submitting
            }
          />
        </div>
      </section>


      <div
        className={
          styles.submitBar
        }
      >
        <div>
          <strong>
            Create as draft
          </strong>

          <span>
            Creating a draft does
            not spend your listing
            credit.
          </span>
        </div>

        <button
          type="button"
          className={
            shared.primaryButton
          }
          disabled={
            submitting
          }
          onClick={() =>
            void submit()
          }
        >
          {submitting
            ? "Creating draft…"
            : "Create marketplace draft"}
        </button>
      </div>
    </div>
  );
}