import type { Metadata } from "next";
import { Suspense } from "react";

import ListingExplorer from "@/components/discovery/ListingExplorer";

export const metadata: Metadata = {
  title: "Property for Sale",
  description: "Browse houses, land and commercial property around OOU communities.",
};

export default function BuyPropertyPage() {
  return (
    <Suspense fallback={null}>
      <ListingExplorer
        listingType="buy_property"
        eyebrow="Property opportunities"
        title="Explore property with the important details already organised."
        description="Discover land, homes and commercial property from approved agents and landlords."
      />
    </Suspense>
  );
}