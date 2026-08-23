import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import type {
  AuthResponse,
} from "@/types/auth";


/* =========================================================
   API CONFIGURATION
========================================================= */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8001/api/v1";


export const API_STATUS_EVENT =
  "homelink:api-status";


const SESSION_MARKER =
  "homelink:has-session";


/* =========================================================
   INTERNAL AUTH STATE
========================================================= */

let accessToken:
  | string
  | null = null;

let refreshPromise:
  | Promise<AuthResponse>
  | null = null;


/* =========================================================
   REQUEST CONFIG
========================================================= */

interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {
  _homelinkRetry?: boolean;
}


/* =========================================================
   API CONNECTION EVENTS
========================================================= */

function emitApiStatus(
  status:
    | "available"
    | "unavailable",
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      API_STATUS_EVENT,
      {
        detail: {
          status,
        },
      },
    ),
  );
}


function isDefinitiveAuthFailure(
  error: unknown,
): boolean {
  if (
    !axios.isAxiosError(
      error,
    )
  ) {
    return false;
  }

  return (
    error.response?.status ===
      401 ||
    error.response?.status ===
      403
  );
}


/* =========================================================
   SESSION MARKER
========================================================= */

export function hasSessionMarker(): boolean {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  return (
    window.localStorage.getItem(
      SESSION_MARKER,
    ) === "true"
  );
}


function storeSessionMarker(): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    SESSION_MARKER,
    "true",
  );
}


function removeSessionMarker(): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.removeItem(
    SESSION_MARKER,
  );
}


/* =========================================================
   ACCESS TOKEN
========================================================= */

export function setAccessToken(
  token:
    | string
    | null,
): void {
  accessToken =
    token;

  if (token) {
    storeSessionMarker();
  }
}


export function getAccessToken():
  string | null {
  return accessToken;
}


export function clearAccessToken(): void {
  accessToken =
    null;

  removeSessionMarker();
}


/* =========================================================
   AXIOS CLIENT
========================================================= */

export const api =
  axios.create({
    baseURL:
      API_BASE_URL,

    timeout:
      20_000,

    withCredentials:
      true,

    headers: {
      Accept:
        "application/json",

      "Content-Type":
        "application/json",
    },
  });


/* =========================================================
   REFRESH ACCESS TOKEN

   IMPORTANT:
   A temporary network outage must NOT destroy the user's
   session marker or behave like a logout.
========================================================= */

export function refreshAccessToken():
  Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise =
      axios
        .post<AuthResponse>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            timeout:
              20_000,

            withCredentials:
              true,

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },
          },
        )
        .then(
          (response) => {
            setAccessToken(
              response.data
                .access_token,
            );

            emitApiStatus(
              "available",
            );

            return response.data;
          },
        )
        .catch(
          (
            error: unknown,
          ) => {
            /*
             * Only remove the session when the server
             * definitively rejects it.
             *
             * ERR_NETWORK / timeout should NOT log out
             * the user.
             */
            if (
              isDefinitiveAuthFailure(
                error,
              )
            ) {
              clearAccessToken();
            } else if (
              axios.isAxiosError(
                error,
              ) &&
              !error.response
            ) {
              emitApiStatus(
                "unavailable",
              );
            }

            throw error;
          },
        )
        .finally(() => {
          refreshPromise =
            null;
        });
  }

  return refreshPromise;
}


/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */

api.interceptors.request.use(
  (
    config,
  ) => {
    const token =
      getAccessToken();

    if (token) {
      config.headers.set(
        "Authorization",
        `Bearer ${token}`,
      );
    }

    return config;
  },

  (
    error: unknown,
  ) => {
    return Promise.reject(
      error,
    );
  },
);


/* =========================================================
   RESPONSE INTERCEPTOR
========================================================= */

api.interceptors.response.use(
  (
    response,
  ) => {
    emitApiStatus(
      "available",
    );

    return response;
  },

  async (
    error: AxiosError,
  ) => {
    /*
     * No HTTP response generally means the browser
     * could not reach HomeLink at all:
     * network failure, CORS/network interruption,
     * connection timeout, etc.
     */
    if (
      !error.response
    ) {
      emitApiStatus(
        "unavailable",
      );
    }

    const originalRequest =
      error.config as
        | RetryableRequestConfig
        | undefined;

    const requestUrl =
      originalRequest?.url ??
      "";

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
      error.response?.status ===
        401 &&
      originalRequest !==
        undefined &&
      !originalRequest
        ._homelinkRetry &&
      !isAuthenticationRequest;

    if (
      !shouldAttemptRefresh
    ) {
      return Promise.reject(
        error,
      );
    }

    originalRequest
      ._homelinkRetry =
      true;

    try {
      const refreshedSession =
        await refreshAccessToken();

      originalRequest.headers.set(
        "Authorization",
        `Bearer ${refreshedSession.access_token}`,
      );

      return api(
        originalRequest,
      );
    } catch (
      refreshError
    ) {
      /*
       * Only force logout when the refresh token
       * itself was rejected.
       *
       * A temporary network outage is NOT logout.
       */
      if (
        isDefinitiveAuthFailure(
          refreshError,
        )
      ) {
        clearAccessToken();

        if (
          typeof window !==
          "undefined"
        ) {
          window.dispatchEvent(
            new Event(
              "homelink:unauthorized",
            ),
          );
        }
      }

      return Promise.reject(
        refreshError,
      );
    }
  },
);