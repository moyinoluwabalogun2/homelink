"use client";

import {
  useEffect,
  type ReactNode,
} from "react";

import {
  Loader2,
  RefreshCw,
  WifiOff,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/context/AuthContext";

import type {
  UserRole,
} from "@/types/auth";

import styles from "./ProtectedRoute.module.css";


export default function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const router =
    useRouter();

  const {
    user,
    status,
    retryRestore,
  } = useAuth();

  const roleAllowed =
    !roles ||
    (
      user
        ? roles.includes(
            user.role,
          )
        : false
    );


  useEffect(
    () => {
      if (
        status ===
        "guest"
      ) {
        router.replace(
          "/login",
        );

        return;
      }

      if (
        status ===
          "authenticated" &&
        !roleAllowed
      ) {
        router.replace(
          "/dashboard",
        );
      }
    },
    [
      status,
      roleAllowed,
      router,
    ],
  );


  if (
    status ===
    "loading"
  ) {
    return (
      <div
        className={
          styles.loading
        }
      >
        <Loader2
          aria-hidden="true"
        />

        <span>
          Restoring your HomeLink session…
        </span>
      </div>
    );
  }


  if (
    status ===
    "unavailable"
  ) {
    return (
      <div
        className={
          styles.unavailable
        }
        role="alert"
      >
        <span
          className={
            styles.unavailableIcon
          }
        >
          <WifiOff
            aria-hidden="true"
          />
        </span>

        <strong>
          We couldn&apos;t restore your session.
        </strong>

        <p>
          Your account was not logged out. HomeLink just could not
          reach the server. Check your connection and try again.
        </p>

        <button
          type="button"
          onClick={
            retryRestore
          }
        >
          <RefreshCw
            aria-hidden="true"
          />

          Try again
        </button>
      </div>
    );
  }


  if (
    status !==
      "authenticated" ||
    !user ||
    !roleAllowed
  ) {
    return null;
  }


  return (
    <>
      {children}
    </>
  );
}