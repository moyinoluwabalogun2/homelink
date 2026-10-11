import type {
  MetadataRoute,
} from "next";

import {
  SITE_URL,
} from "@/lib/site-config";


export default function robots():
  MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",

        allow: "/",

        disallow: [
          "/admin/",
          "/api/",
          "/dashboard/",
          "/forgot-password",
          "/login",
          "/payment/",
          "/post-listing/",
          "/register",
          "/reset-password",
          "/verify-email",
        ],
      },
    ],

    sitemap:
      `${SITE_URL}/sitemap.xml`,

    host:
      SITE_URL,
  };
}