"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

import styles from "./CookieNoticeBanner.module.css";

const STORAGE_KEY = "homelink-cookie-notice-acknowledged";

export default function CookieNoticeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(STORAGE_KEY) !== "true");
  }, []);

  const acknowledge = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className={styles.banner} aria-label="Cookie notice">
      <div className={styles.content}>
        <span className={styles.icon}>
          <Cookie aria-hidden="true" />
        </span>

        <div className={styles.copy}>
          <strong>Essential cookies only.</strong>
          <p>
            HomeLink uses necessary cookies and browser storage for secure
            sessions and preferences. Analytics and advertising cookies are not
            enabled.
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href="/cookie-policy">Read the notice</Link>
        <button type="button" onClick={acknowledge}>
          Understood
        </button>
      </div>
    </aside>
  );
}