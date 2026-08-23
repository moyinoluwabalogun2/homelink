"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CloudOff,
  WifiOff,
} from "lucide-react";

import {
  API_BASE_URL,
} from "@/lib/api";

import styles from "./ConnectionBanner.module.css";


type ConnectionState =
  | "online"
  | "offline"
  | "backend-unavailable";


export default function ConnectionBanner() {
  const [
    state,
    setState,
  ] = useState<ConnectionState>(
    "online",
  );

  const [
    checking,
    setChecking,
  ] = useState(false);


  const checkConnection =
    useCallback(
      async () => {
        if (
          !navigator.onLine
        ) {
          setState(
            "offline",
          );

          return;
        }

        setChecking(
          true,
        );

        const controller =
          new AbortController();

        const timeout =
          window.setTimeout(
            () => {
              controller.abort();
            },
            5_000,
          );

        try {
          /*
           * IMPORTANT:
           *
           * Use /health/live here.
           *
           * /health/live only confirms the FastAPI
           * application is reachable.
           *
           * Do NOT use /health/ready from the browser
           * because readiness checks PostgreSQL + Redis.
           */
          const response =
            await fetch(
              `${API_BASE_URL}/health/live`,
              {
                method:
                  "GET",

                credentials:
                  "include",

                cache:
                  "no-store",

                signal:
                  controller.signal,
              },
            );

          setState(
            response.ok
              ? "online"
              : "backend-unavailable",
          );

        } catch {
          setState(
            navigator.onLine
              ? "backend-unavailable"
              : "offline",
          );

        } finally {
          window.clearTimeout(
            timeout,
          );

          setChecking(
            false,
          );
        }
      },
      [],
    );


  useEffect(() => {
    const handleOnline =
      () => {
        void checkConnection();
      };

    const handleOffline =
      () => {
        setState(
          "offline",
        );
      };


    /*
     * One check when this provider mounts.
     *
     * There is intentionally NO interval.
     */
    void checkConnection();


    window.addEventListener(
      "online",
      handleOnline,
    );

    window.addEventListener(
      "offline",
      handleOffline,
    );


    return () => {
      window.removeEventListener(
        "online",
        handleOnline,
      );

      window.removeEventListener(
        "offline",
        handleOffline,
      );
    };
  }, [
    checkConnection,
  ]);


  if (
    state === "online"
  ) {
    return null;
  }


  const offline =
    state === "offline";


  return (
    <aside
      className={
        styles.banner
      }
      role="status"
      aria-live="polite"
    >
      <div
        className={
          styles.message
        }
      >
        {offline ? (
          <WifiOff
            aria-hidden="true"
          />
        ) : (
          <CloudOff
            aria-hidden="true"
          />
        )}

        <div>
          <strong>
            {offline
              ? "Your device is offline."
              : "HomeLink services are temporarily unavailable."}
          </strong>

          <span>
            {offline
              ? "Reconnect to continue using live listings and account features."
              : "HomeLink could not be reached. Your existing account data remains safe while the connection recovers."}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={
          checking
        }
        onClick={() =>
          void checkConnection()
        }
      >
        {checking
          ? "Checking…"
          : "Check again"}
      </button>
    </aside>
  );
}