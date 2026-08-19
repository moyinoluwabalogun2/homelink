"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, WifiOff } from "lucide-react";

import { API_BASE_URL } from "@/lib/api";

import styles from "./ConnectionBanner.module.css";

type ConnectionState = "online" | "offline" | "backend-unavailable";

export default function ConnectionBanner() {
  const [state, setState] = useState<ConnectionState>("online");
  const [checking, setChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setState("offline");
      return;
    }

    setChecking(true);

    try {
      const response = await fetch(`${API_BASE_URL}/health/ready`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      setState(response.ok ? "online" : "backend-unavailable");
    } catch {
      setState("backend-unavailable");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => void checkConnection();
    const handleOffline = () => setState("offline");

    void checkConnection();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = window.setInterval(() => {
      void checkConnection();
    }, 60_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(interval);
    };
  }, [checkConnection]);

  if (state === "online") return null;

  const offline = state === "offline";

  return (
    <aside className={styles.banner} role="status" aria-live="polite">
      <div className={styles.message}>
        {offline ? (
          <WifiOff aria-hidden="true" />
        ) : (
          <CloudOff aria-hidden="true" />
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
              : "The interface is available, but requests may fail until the backend reconnects."}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={checking}
        onClick={() => void checkConnection()}
      >
        {checking ? "Checking…" : "Check again"}
      </button>
    </aside>
  );
}