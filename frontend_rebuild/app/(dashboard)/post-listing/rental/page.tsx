import PropertyListingForm from "@/components/forms/PropertyListingForm";

interface RentalListingPageProps {
  searchParams?: {
    edit?: string | string[];
  };
}

export default function RentalListingPage({
  searchParams,
}: RentalListingPageProps) {
  const editValue =
    searchParams?.edit;

  const listingId =
    Array.isArray(
      editValue,
    )
      ? editValue[0]
      : editValue;

  return (
    <PropertyListingForm
      mode="rental"
      listingId={
        listingId
      }
    />
  );
}