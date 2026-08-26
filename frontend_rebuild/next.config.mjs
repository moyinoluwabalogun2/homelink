import {
  PHASE_DEVELOPMENT_SERVER,
} from "next/constants.js";


/*
 * Backend origin used only by Next.js server-side rewrites.
 *
 * Production:
 * BACKEND_API_ORIGIN=https://homelink-vo5e.onrender.com
 *
 * Local development falls back to localhost.
 */
const backendOrigin = (
  process.env.BACKEND_API_ORIGIN ??
  "http://localhost:8001"
).replace(/\/+$/, "");


/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },

  /*
   * Authentication is deliberately proxied through the same
   * origin as the frontend.
   *
   * Browser:
   *   /api/v1/auth/login
   *   /api/v1/auth/refresh
   *   /api/v1/auth/logout
   *
   * Next forwards internally to:
   *   Render /api/v1/auth/...
   *
   * This makes HomeLink's refresh cookie first-party instead
   * of depending on a cross-site Render cookie.
   */
  async rewrites() {
    return [
      {
        source:
          "/api/v1/auth/:path*",

        destination:
          `${backendOrigin}/api/v1/auth/:path*`,
      },
    ];
  },
};


/**
 * Keep development output separate from production build output.
 *
 * next dev   -> .next-dev
 * next build -> .next
 */
export default function nextConfig(
  phase,
) {
  return {
    ...baseConfig,

    distDir:
      phase ===
      PHASE_DEVELOPMENT_SERVER
        ? ".next-dev"
        : ".next",
  };
}