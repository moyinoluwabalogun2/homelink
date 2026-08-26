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

/*
 * Normal API traffic continues directly to FastAPI.
 *
 * This is especially important for HomeLink's long-lived
 * live-events/SSE connection.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8001/api/v1";


/*
 * Authentication traffic deliberately goes through the
 * Next.js same-origin proxy.
 *
 * Browser:
 *   /api/v1/auth/*
 *
 * Next rewrite:
 *   Render /api/v1/auth/*
 */
export const AUTH_API_BASE_URL =
  "/api/v1";


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


/*
 * Exported because AuthContext must distinguish:
 *
 * 401 / 403
 *   real authentication rejection
 *
 * timeout / ERR_NETWORK / 5xx
 *   temporary service problem
 */
export function isDefinitiveAuthFailure(
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

export function hasSessionMarker():
  boolean {
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


function storeSessionMarker():
  void {
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


function removeSessionMarker():
  void {
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


export function clearAccessToken():
  void {
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
   AUTH ROUTE DETECTION
========================================================= */

function isAuthRoute(
  url:
    | string
    | undefined,
): boolean {
  if (!url) {
    return false;
  }

  return (
    url === "/auth" ||
    url.startsWith(
      "/auth/",
    )
  );
}


/* =========================================================
   REFRESH ACCESS TOKEN
========================================================= */

export function refreshAccessToken():
  Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise =
      axios
        .post<AuthResponse>(
          `${AUTH_API_BASE_URL}/auth/refresh`,
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
          (
            response,
          ) => {
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
             * Only destroy the browser's session state when the
             * authentication server definitively rejects the
             * refresh token.
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
        .finally(
          () => {
            refreshPromise =
              null;
          },
        );
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
    /*
     * Authentication endpoints must use the same-origin
     * Next.js proxy so the refresh cookie belongs to the
     * frontend site.
     *
     * All other API calls remain direct to Render.
     */
    if (
      isAuthRoute(
        config.url,
      )
    ) {
      config.baseURL =
        AUTH_API_BASE_URL;
    }


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
     * No HTTP response generally means:
     *
     * - network interruption
     * - timeout
     * - browser connectivity issue
     * - unreachable backend
     *
     * None of those should automatically log the user out.
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
      isAuthRoute(
        requestUrl,
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
       * Only force logout when the refresh session itself was
       * rejected.
       *
       * Network errors and temporary backend problems are NOT
       * equivalent to logout.
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