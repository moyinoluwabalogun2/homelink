import type {
  Metadata,
  Viewport,
} from "next";

import {
  DM_Sans,
  Manrope,
} from "next/font/google";

import AppShell from "@/components/layout/AppShell";
import AppProviders from "@/components/providers/AppProviders";

import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site-config";

// @ts-ignore: CSS side-effect import declaration is not found in this project setup.
import "./globals.css";


const dmSans = DM_Sans({
  subsets: [
    "latin",
  ],
  variable:
    "--font-dm-sans",
  display: "swap",
});


const manrope = Manrope({
  subsets: [
    "latin",
  ],
  variable:
    "--font-manrope",
  display: "swap",
});


export const metadata:
  Metadata = {
  metadataBase:
    new URL(
      SITE_URL,
    ),

  title: {
    default:
      "HomeLink — Living Around OOU",

    template:
      "%s | HomeLink",
  },

  description:
    SITE_DESCRIPTION,

  applicationName:
    SITE_NAME,

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",

    siteName:
      SITE_NAME,

    title:
      "HomeLink — Living Around OOU",

    description:
      SITE_DESCRIPTION,

    url: "/",

    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "HomeLink",
      },
    ],
  },

  twitter: {
    card: "summary",

    title:
      "HomeLink — Living Around OOU",

    description:
      SITE_DESCRIPTION,

    images: [
      "/icon.png",
    ],
  },

  robots: {
    index: true,
    follow: true,
  },
};


export const viewport:
  Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f5f0",
};


export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`
        ${dmSans.variable}
        ${manrope.variable}
      `}
    >
      <body>
        <AppProviders>
          <AppShell>
            {children}
          </AppShell>
        </AppProviders>
      </body>
    </html>
  );
}