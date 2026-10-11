import type {
  MetadataRoute,
} from "next";

import {
  SITE_URL,
} from "@/lib/site-config";


const publicRoutes = [
  "",
  "/rentals",
  "/buy-property",
  "/marketplace",
  "/agents",
  "/safety",
  "/safety/rentals",
  "/support",
  "/privacy",
  "/terms",
  "/cookie-policy",
];


export default function sitemap():
  MetadataRoute.Sitemap {
  return publicRoutes.map(
    (
      path,
    ) => ({
      url:
        `${SITE_URL}${path}`,

      lastModified:
        new Date(),

      changeFrequency:
        path === ""
          ? "daily"
          : "weekly",

      priority:
        path === ""
          ? 1
          : 0.7,
    }),
  );
}