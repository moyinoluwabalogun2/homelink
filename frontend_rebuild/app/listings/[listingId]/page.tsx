import type {
  Metadata,
} from "next";

import ListingDetailsClient from "@/components/listings/ListingDetailsClient";
import ListingStructuredData from "@/components/seo/ListingStructuredData";

import {
  getPublicListing,
  listingCoverImage,
  listingDescription,
} from "@/lib/public-listing";


interface ListingPageProps {
  params: {
    listingId: string;
  };
}


export async function generateMetadata({
  params,
}: ListingPageProps): Promise<
  Metadata
> {
  const listing =
    await getPublicListing(
      params.listingId,
    );

  if (!listing) {
    return {
      title:
        "Listing Unavailable",

      description:
        "This HomeLink listing is no longer publicly available.",

      robots: {
        index: false,
        follow: false,
        noarchive: true,
      },
    };
  }

  const description =
    listingDescription(
      listing,
    );

  const image =
    listingCoverImage(
      listing,
    );

  const canonical =
    `/listings/${listing.id}`;

  return {
    title:
      listing.title,

    description,

    alternates: {
      canonical,
    },

    openGraph: {
      type: "website",

      title:
        listing.title,

      description,

      url:
        canonical,

      ...(
        image
          ? {
              images: [
                {
                  url:
                    image,

                  alt:
                    listing.title,
                },
              ],
            }
          : {}
      ),
    },

    twitter: {
      card:
        image
          ? "summary_large_image"
          : "summary",

      title:
        listing.title,

      description,

      ...(
        image
          ? {
              images: [
                image,
              ],
            }
          : {}
      ),
    },

    robots: {
      index: true,
      follow: true,
    },
  };
}


export default async function ListingDetailsPage({
  params,
}: ListingPageProps) {
  const listing =
    await getPublicListing(
      params.listingId,
    );

  return (
    <>
      {listing ? (
        <ListingStructuredData
          listing={
            listing
          }
        />
      ) : null}

      <ListingDetailsClient
        listingId={
          params.listingId
        }
      />
    </>
  );
}