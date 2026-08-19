import type { Metadata } from "next";

import ListingDetailsClient from "@/components/listings/ListingDetailsClient";

export const metadata: Metadata = {
  title: "Listing Details",
};

export default function ListingDetailsPage({
  params,
}: {
  params: { listingId: string };
}) {
  return <ListingDetailsClient listingId={params.listingId} />;
}