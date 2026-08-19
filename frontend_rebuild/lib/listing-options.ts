import type { ListingType } from "@/types/listing";

export interface SelectOption {
  label: string;
  value: string;
}

export const rentalCategoryOptions: SelectOption[] = [
  { label: "Hostel", value: "hostel" },
  { label: "Single room", value: "single_room" },
  { label: "Self contain", value: "self_contain" },
  { label: "Shared apartment", value: "shared_apartment" },
  { label: "Mini flat", value: "mini_flat" },
  { label: "Flat", value: "flat" },
  { label: "Duplex", value: "duplex" },
];

export const propertyCategoryOptions: SelectOption[] = [
  { label: "Land", value: "land" },
  { label: "House", value: "house" },
  { label: "Duplex", value: "duplex" },
  { label: "Commercial property", value: "commercial" },
  { label: "Office", value: "office" },
  { label: "Warehouse", value: "warehouse" },
];

export const marketplaceCategoryOptions: SelectOption[] = [
  { label: "Phones", value: "phones" },
  { label: "Laptops", value: "laptops" },
  { label: "Furniture", value: "furniture" },
  { label: "Electronics", value: "electronics" },
  { label: "Appliances", value: "appliances" },
  { label: "Fashion", value: "fashion" },
  { label: "Books", value: "books" },
  { label: "Gadgets", value: "gadgets" },
  { label: "Services", value: "services" },
  { label: "Others", value: "others" },
];

export function categoriesFor(type: ListingType): SelectOption[] {
  if (type === "rental") return rentalCategoryOptions;
  if (type === "buy_property") return propertyCategoryOptions;
  return marketplaceCategoryOptions;
}