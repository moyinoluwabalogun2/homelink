"use client";

import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/auth";

import styles from "./ProtectedRoute.module.css";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const router = useRouter();
  const { user, status } = useAuth();

  const roleAllowed =
    !roles || (user ? roles.includes(user.role) : false);

  useEffect(() => {
    if (status === "guest") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && !roleAllowed) {
      router.replace("/dashboard");
    }
  }, [status, roleAllowed, router]);

  if (status === "loading") {
    return (
      <div className={styles.loading}>
        <Loader2 aria-hidden="true" />
        <span>Restoring your HomeLink session…</span>
      </div>
    );
  }

  if (status !== "authenticated" || !user || !roleAllowed) {
    return null;
  }

  return <>{children}</>;
}