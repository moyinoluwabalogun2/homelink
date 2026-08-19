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

// @ts-ignore: CSS side-effect import declaration is not found in this project setup.
import "./globals.css";


const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});


const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});


export const metadata: Metadata = {
  title: {
    default:
      "HomeLink — Living Around OOU",

    template:
      "%s | HomeLink",
  },

  description:
    "Find rentals, property, trusted agents and student marketplace listings around OOU.",

  applicationName:
    "HomeLink",
};


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f5f0",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
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