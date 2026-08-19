"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

const privateRoutePrefixes = [
  "/dashboard",
  "/post-listing",
  "/payment",
  "/agent",
  "/admin",
];

const authRoutePrefixes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

function matchesRoute(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPrivateRoute = matchesRoute(pathname, privateRoutePrefixes);
  const isAuthRoute = matchesRoute(pathname, authRoutePrefixes);
  const showPublicChrome = !isPrivateRoute && !isAuthRoute;

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      {showPublicChrome ? <Navbar /> : null}

      <main id="main-content" className="site-main" tabIndex={-1}>
        {children}
      </main>

      {showPublicChrome ? <Footer /> : null}
    </div>
  );
}