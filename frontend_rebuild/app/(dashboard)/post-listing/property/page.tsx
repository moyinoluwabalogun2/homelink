import PropertyListingForm from "@/components/forms/PropertyListingForm";

interface BuyPropertyListingPageProps {
  searchParams?: {
    edit?: string | string[];
  };
}

export default function BuyPropertyListingPage({
  searchParams,
}: BuyPropertyListingPageProps) {
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
      mode="buy_property"
      listingId={
        listingId
      }
    />
  );
}