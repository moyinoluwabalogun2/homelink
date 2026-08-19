import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HomeLink — OOU Living",
    short_name: "HomeLink",
    description:
      "Discover rentals, property listings, approved agents and student " +
      "marketplace items around OOU.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6f4",
    theme_color: "#111214",
    icons: [
  {
    src: "/brand/homelink-logo.png",
    sizes: "512x512",
    type: "image/png",
  },],
  };
}