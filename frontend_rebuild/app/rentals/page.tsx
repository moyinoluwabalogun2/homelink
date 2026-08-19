import type { Metadata } from "next";
import { Suspense } from "react";

import ListingExplorer from "@/components/discovery/ListingExplorer";

export const metadata: Metadata = {
  title: "Student Rentals",
  description: "Browse rental listings around OOU campuses and nearby communities.",
};

export default function RentalsPage() {
  return (
    <Suspense fallback={null}>
      <ListingExplorer
        listingType="rental"
        eyebrow="Student accommodation"
        title="Find somewhere comfortable, close and within budget."
        description="Explore hostels, rooms, self-contained apartments and shared homes across OOU communities."
      />
    </Suspense>
  );
}