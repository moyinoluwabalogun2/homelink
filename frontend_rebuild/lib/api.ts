import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import type { AuthResponse } from "@/types/auth";


/* =========================================================
   API Configuration
========================================================= */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8001/api/v1";

const SESSION_MARKER =
  "homelink:has-session";


/* =========================================================
   Internal Authentication State
========================================================= */

let accessToken: string | null = null;

let refreshPromise:
  | Promise<AuthResponse>
  | null = null;


/* =========================================================
   Request Configuration
========================================================= */

interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {
  _homelinkRetry?: boolean;
}


/* =========================================================
   Session Marker
========================================================= */

export function hasSessionMarker(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.localStorage.getItem(
      SESSION_MARKER,
    ) === "true"
  );
}

function storeSessionMarker(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    SESSION_MARKER,
    "true",
  );
}

function removeSessionMarker(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    SESSION_MARKER,
  );
}


/* =========================================================
   Access Token Management
========================================================= */

export function setAccessToken(
  token: string | null,
): void {
  accessToken = token;

  if (token) {
    storeSessionMarker();
  }
}

export function getAccessToken():
  string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
  removeSessionMarker();
}


/* =========================================================
   Axios API Client
========================================================= */

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  withCredentials: true,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});


/* =========================================================
   Refresh Access Token
========================================================= */

export function refreshAccessToken():
  Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<AuthResponse>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          timeout: 20_000,
          withCredentials: true,

          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      )
      .then((response) => {
        setAccessToken(
          response.data.access_token,
        );

        return response.data;
      })
      .catch((error: unknown) => {
        clearAccessToken();

        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}


/* =========================================================
   Request Interceptor
========================================================= */

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.set(
        "Authorization",
        `Bearer ${token}`,
      );
    }

    return config;
  },

  (error: unknown) => {
    return Promise.reject(error);
  },
);


/* =========================================================
   Response Interceptor
========================================================= */

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as
        | RetryableRequestConfig
        | undefined;

    const requestUrl =
      originalRequest?.url ?? "";

    const isAuthenticationRequest =
      requestUrl.includes(
        "/auth/login",
      ) ||
      requestUrl.includes(
        "/auth/register",
      ) ||
      requestUrl.includes(
        "/auth/refresh",
      ) ||
      requestUrl.includes(
        "/auth/forgot-password",
      ) ||
      requestUrl.includes(
        "/auth/reset-password",
      );

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      originalRequest !== undefined &&
      !originalRequest._homelinkRetry &&
      !isAuthenticationRequest;

    if (!shouldAttemptRefresh) {
      return Promise.reject(error);
    }

    originalRequest._homelinkRetry =
      true;

    try {
      const refreshedSession =
        await refreshAccessToken();

      originalRequest.headers.set(
        "Authorization",
        `Bearer ${refreshedSession.access_token}`,
      );

      return api(originalRequest);
    } catch (refreshError) {
      clearAccessToken();

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new Event(
            "homelink:unauthorized",
          ),
        );
      }

      return Promise.reject(
        refreshError,
      );
    }
  },
);