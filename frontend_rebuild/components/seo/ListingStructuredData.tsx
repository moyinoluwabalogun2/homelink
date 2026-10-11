import {
  listingCoverImage,
  listingDescription,
} from "@/lib/public-listing";

import {
  SITE_NAME,
  SITE_URL,
} from "@/lib/site-config";

import type {
  Listing,
} from "@/types/listing";


function safeJson(
  value: unknown,
): string {
  return JSON
    .stringify(
      value,
    )
    .replace(
      /</g,
      "\\u003c",
    );
}


export default function ListingStructuredData({
  listing,
}: {
  listing: Listing;
}) {
  const image =
    listingCoverImage(
      listing,
    );

  const data = {
    "@context":
      "https://schema.org",

    "@type":
      "Product",

    name:
      listing.title,

    description:
      listingDescription(
        listing,
      ),

    url:
      `${SITE_URL}/listings/${listing.id}`,

    ...(
      image
        ? {
            image: [
              image,
            ],
          }
        : {}
    ),

    category:
      listing.listing_type,

    brand: {
      "@type":
        "Brand",

      name:
        SITE_NAME,
    },

    offers: {
      "@type":
        "Offer",

      priceCurrency:
        listing.currency,

      price:
        String(
          listing.price,
        ),

      availability:
        "https://schema.org/InStock",

      url:
        `${SITE_URL}/listings/${listing.id}`,

      seller: {
        "@type":
          "Person",

        name:
          listing.owner
            .full_name,
      },

      areaServed:
        listing.area.name,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html:
          safeJson(
            data,
          ),
      }}
    />
  );
}