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
    name: "Ibogun",
    slug: "ibogun",
    campus: "Engineering campus",
    description:
      "Accommodation around the engineering campus community.",
  },
  {
    name: "Shagamu",
    slug: "shagamu",
    campus: "Medical campus",
    description:
      "Convenient housing for students around Shagamu campus.",
  },
  {
    name: "Ijebu-Igbo",
    slug: "ijebu-igbo",
    campus: "Nearby community",
    description:
      "Affordable options in a growing student community.",
  },
];

export const rentalCategories = [
  {
    label: "Hostel",
    value: "hostel",
  },
  {
    label: "Single room",
    value: "single-room",
  },
  {
    label: "Self contain",
    value: "self-contain",
  },
  {
    label: "Shared apartment",
    value: "shared-apartment",
  },
  {
    label: "Mini flat",
    value: "mini-flat",
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