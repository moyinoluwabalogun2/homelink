"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

import ConnectionBanner from "@/components/system/ConnectionBanner";
import CookieNoticeBanner from "@/components/system/CookieNoticeBanner";
import { AuthProvider } from "@/context/AuthContext";


export default function AppProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      {children}

      <ConnectionBanner />
      <CookieNoticeBanner />

      <Toaster
        theme="light"
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
        }}
      />
    </AuthProvider>
  );
}