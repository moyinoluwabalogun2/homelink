"use client";

import {
  Moon,
  Sun,
} from "lucide-react";

import {
  useTheme,
} from "@/components/theme/ThemeProvider";

import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const {
    theme,
    isReady,
    toggleTheme,
  } = useTheme();

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={styles.button}
      onClick={toggleTheme}
      aria-label={
        isDark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      title={
        isDark
          ? "Light mode"
          : "Dark mode"
      }
      disabled={!isReady}
    >
      {isReady && isDark ? (
        <Sun aria-hidden="true" />
      ) : (
        <Moon aria-hidden="true" />
      )}
    </button>
  );
}