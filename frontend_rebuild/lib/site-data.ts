export type RentalArea = {
  name: string;
  slug: string;
  campus: string;
  description: string;
};

export const rentalAreas: RentalArea[] = [
  {
    name: "Ago-Iwoye",
    slug: "ago-iwoye",
    campus: "Main campus",
    description:
      "Student-friendly rentals close to OOU's main campus.",
  },
  {
    name: "Ijebu-Ode",
    slug: "ijebu-ode",
    campus: "City access",
    description:
      "Homes, apartments and student essentials across the city.",
  },
  {
    name: "Ijebu-Igbo",
    slug: "ijebu-igbo",
    campus: "Nearby community",
    description:
      "Affordable options in a growing student community.",
  },
  {
    name: "Oru",
    slug: "oru",
    campus: "Nearby community",
    description:
      "Rentals, properties and student essentials across Oru.",
  },
  {
    name: "Ibogun",
    slug: "ibogun",
    campus: "Engineering campus",
    description:
      "Accommodation around the engineering campus community.",
  },
  {
    name: "Shagamu",
    slug: "shagamu",
    campus: "Health sciences campus",
    description:
      "Convenient housing around OOU's health sciences campus.",
  },
  {
    name: "Aiyetoro",
    slug: "aiyetoro",
    campus: "Growing community",
    description:
      "Discover rentals, properties and marketplace listings across Aiyetoro.",
  },
];

export const rentalCategories = [
  {
    label: "Hostel",
    value: "hostel",
  },
  {
    label: "Single room",
    value: "single_room",
  },
  {
    label: "Self contain",
    value: "self_contain",
  },
  {
    label: "Shared apartment",
    value: "shared_apartment",
  },
  {
    label: "Mini flat",
    value: "mini_flat",
  },
  {
    label: "Flat",
    value: "flat",
  },
  {
    label: "Duplex",
    value: "duplex",
  },
] as const;