import type { MetadataRoute } from "next";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return publicRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}