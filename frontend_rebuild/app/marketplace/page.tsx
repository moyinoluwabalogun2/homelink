import type { Metadata } from "next";
import { Suspense } from "react";

import ListingExplorer from "@/components/discovery/ListingExplorer";

export const metadata: Metadata = {
  title: "Student Marketplace",
  description: "Buy and sell useful student items around OOU.",
};

export default function MarketplacePage() {
  return (
    <Suspense fallback={null}>
      <ListingExplorer
        listingType="marketplace"
        eyebrow="Student marketplace"
        title="Useful things, closer to campus and easier to discover."
        description="Browse furniture, gadgets, appliances, books and services listed by the HomeLink community."
      />
    </Suspense>
  );
}