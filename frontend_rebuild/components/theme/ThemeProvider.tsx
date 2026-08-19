"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  isReady: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "homelink-theme";

const ThemeContext =
  createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setThemeState] =
    useState<Theme>("light");

  const [isReady, setIsReady] =
    useState(false);

  useEffect(() => {
    const initialTheme: Theme =
      document.documentElement.dataset.theme === "dark"
        ? "dark"
        : "light";

    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setIsReady(true);
  }, []);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);
      applyTheme(nextTheme);

      window.localStorage.setItem(
        STORAGE_KEY,
        nextTheme,
      );
    },
    [],
  );

  const toggleTheme = useCallback(() => {
    setTheme(
      theme === "dark" ? "light" : "dark",
    );
  }, [setTheme, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isReady,
      setTheme,
      toggleTheme,
    }),
    [
      theme,
      isReady,
      setTheme,
      toggleTheme,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider.",
    );
  }

  return context;
}