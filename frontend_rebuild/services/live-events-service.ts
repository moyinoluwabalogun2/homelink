import {
  API_BASE_URL,
  getAccessToken,
  refreshAccessToken,
} from "@/lib/api";

import type {
  Notification,
} from "@/types/notification";


/* =========================================================
   TYPES
========================================================= */

export interface LiveMessagePayload {
  id: string;
  inquiry_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  updated_at: string;
}


export interface LiveMessageCreatedData {
  inquiry_id: string;
  listing_id: string;
  listing_title: string;

  status:
    | "open"
    | "responded"
    | "closed";

  message: LiveMessagePayload;

  /**
   * True only when the conversation changed from read to unread.
   * This prevents the inquiry badge from overcounting.
   */
  became_unread?: boolean;

  /**
   * The notification created for this message.
   * It allows the notification page to update without refetching.
   */
  notification?: Notification;
}


export interface LiveEvent {
  type: string;
  data?: unknown;
}


export interface MessageCreatedEvent
  extends LiveEvent {
  type: "message.created";
  data: LiveMessageCreatedData;
}


type LiveEventListener = (
  event: LiveEvent,
) => void;


/* =========================================================
   CONSTANTS
========================================================= */

export const LIVE_EVENT =
  "homelink:live-event";

export const LIVE_STATUS_EVENT =
  "homelink:live-status";


/**
 * React development mode can briefly unsubscribe and subscribe
 * again. This grace period avoids closing and reopening the
 * network connection unnecessarily.
 */
const STOP_GRACE_MS = 500;


/* =========================================================
   SHARED CONNECTION STATE

   Every dashboard component shares one event stream.
========================================================= */

const listeners =
  new Set<LiveEventListener>();

let controller:
  | AbortController
  | null = null;

let running = false;
let reconnectAttempt = 0;
let connectionGeneration = 0;

let stopTimer:
  | number
  | null = null;


/* =========================================================
   STATUS AND EVENT HELPERS
========================================================= */

function emitStatus(
  status:
    | "connecting"
    | "connected"
    | "disconnected",
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      LIVE_STATUS_EVENT,
      {
        detail: {
          status,
        },
      },
    ),
  );
}


function emitEvent(
  event: LiveEvent,
): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      /**
       * One broken subscriber must never interrupt the shared
       * HomeLink live-event connection.
       */
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(
        LIVE_EVENT,
        {
          detail: event,
        },
      ),
    );
  }
}


/* =========================================================
   ERROR HELPERS
========================================================= */

function isAbortError(
  error: unknown,
): boolean {
  return (
    error instanceof DOMException
    && error.name === "AbortError"
  );
}


/* =========================================================
   ABORTABLE RECONNECT DELAY
========================================================= */

function sleep(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      if (signal.aborted) {
        reject(
          new DOMException(
            "Aborted",
            "AbortError",
          ),
        );

        return;
      }

      const timeout =
        window.setTimeout(
          () => {
            cleanup();
            resolve();
          },
          milliseconds,
        );

      const onAbort =
        () => {
          window.clearTimeout(
            timeout,
          );

          cleanup();

          reject(
            new DOMException(
              "Aborted",
              "AbortError",
            ),
          );
        };

      const cleanup =
        () => {
          signal.removeEventListener(
            "abort",
            onAbort,
          );
        };

      signal.addEventListener(
        "abort",
        onAbort,
        {
          once: true,
        },
      );
    },
  );
}


/* =========================================================
   WAIT FOR INTERNET CONNECTION
========================================================= */

function waitUntilOnline(
  signal: AbortSignal,
): Promise<void> {
  if (
    typeof window === "undefined"
    || navigator.onLine
  ) {
    return Promise.resolve();
  }

  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const handleOnline =
        () => {
          cleanup();
          resolve();
        };

      const handleAbort =
        () => {
          cleanup();

          reject(
            new DOMException(
              "Aborted",
              "AbortError",
            ),
          );
        };

      const cleanup =
        () => {
          window.removeEventListener(
            "online",
            handleOnline,
          );

          signal.removeEventListener(
            "abort",
            handleAbort,
          );
        };

      window.addEventListener(
        "online",
        handleOnline,
        {
          once: true,
        },
      );

      signal.addEventListener(
        "abort",
        handleAbort,
        {
          once: true,
        },
      );
    },
  );
}


/* =========================================================
   AUTHENTICATED STREAM REQUEST
========================================================= */

async function openAuthenticatedStream(
  signal: AbortSignal,
): Promise<Response> {
  let token = getAccessToken();

  /**
   * A hard browser refresh clears the in-memory access token.
   * Restore the session once using the secure refresh cookie.
   */
  if (!token) {
    const refreshed =
      await refreshAccessToken();

    token = refreshed.access_token;
  }

  const request =
    (
      accessToken: string,
    ) =>
      fetch(
        `${API_BASE_URL}/events/stream`,
        {
          method: "GET",

          headers: {
            Accept:
              "text/event-stream",

            Authorization:
              `Bearer ${accessToken}`,
          },

          credentials:
            "include",

          cache:
            "no-store",

          signal,
        },
      );

  let response =
    await request(token);

  /**
   * The token can expire while the dashboard remains open.
   * Refresh once and retry the connection.
   */
  if (response.status === 401) {
    const refreshed =
      await refreshAccessToken();

    response = await request(
      refreshed.access_token,
    );
  }

  return response;
}


/* =========================================================
   SERVER-SENT EVENT PARSER
========================================================= */

function parseBlock(
  block: string,
): {
  eventName: string;
  data: string;
} | null {
  const lines =
    block.split("\n");

  let eventName =
    "message";

  const dataLines:
    string[] = [];

  for (const rawLine of lines) {
    const line =
      rawLine.trimEnd();

    if (
      !line
      || line.startsWith(":")
    ) {
      continue;
    }

    if (line.startsWith("event:")) {
      eventName =
        line.slice(6).trim();

      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(
        line.slice(5).trimStart(),
      );
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return {
    eventName,
    data: dataLines.join("\n"),
  };
}


/* =========================================================
   HANDLE ONE EVENT
========================================================= */

function handleBlock(
  block: string,
): void {
  const parsed =
    parseBlock(block);

  if (!parsed) {
    return;
  }

  try {
    const payload =
      JSON.parse(
        parsed.data,
      ) as LiveEvent;

    if (payload.type === "connected") {
      emitStatus("connected");
      reconnectAttempt = 0;

      return;
    }

    emitEvent(payload);
  } catch {
    /**
     * Ignore one malformed event instead of terminating the
     * entire live connection.
     */
  }
}


/* =========================================================
   READ ONE STREAM CONNECTION
========================================================= */

async function consumeStream(
  signal: AbortSignal,
): Promise<void> {
  emitStatus("connecting");

  const response =
    await openAuthenticatedStream(
      signal,
    );

  if (!response.ok) {
    throw new Error(
      `Live event stream returned HTTP ${response.status}.`,
    );
  }

  if (!response.body) {
    throw new Error(
      "Live event stream response has no body.",
    );
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();

  let buffer = "";

  try {
    while (!signal.aborted) {
      const {
        done,
        value,
      } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder
        .decode(
          value,
          {
            stream: true,
          },
        )
        .replace(
          /\r\n/g,
          "\n",
        );

      let separatorIndex =
        buffer.indexOf("\n\n");

      while (separatorIndex !== -1) {
        const block =
          buffer.slice(
            0,
            separatorIndex,
          );

        buffer =
          buffer.slice(
            separatorIndex + 2,
          );

        handleBlock(block);

        separatorIndex =
          buffer.indexOf("\n\n");
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Ignore cleanup errors.
    }

    try {
      reader.releaseLock();
    } catch {
      // Ignore cleanup errors.
    }
  }
}


/* =========================================================
   CONNECTION LOOP

   This is not polling. One HTTP stream remains open.
   Reconnection only happens if that stream disconnects.
========================================================= */

async function connectionLoop(
  signal: AbortSignal,
  generation: number,
): Promise<void> {
  while (
    running
    && listeners.size > 0
    && !signal.aborted
    && generation
      === connectionGeneration
  ) {
    try {
      await waitUntilOnline(
        signal,
      );

      if (
        signal.aborted
        || generation
          !== connectionGeneration
      ) {
        return;
      }

      await consumeStream(
        signal,
      );

      if (
        signal.aborted
        || !running
        || generation
          !== connectionGeneration
      ) {
        return;
      }

      emitStatus(
        "disconnected",
      );
    } catch (error) {
      if (
        signal.aborted
        || generation
          !== connectionGeneration
        || isAbortError(error)
      ) {
        return;
      }

      emitStatus(
        "disconnected",
      );
    }

    reconnectAttempt += 1;

    /**
     * Reconnect delays:
     * 1 second, 2 seconds, 4 seconds, 8 seconds,
     * then a maximum of 15 seconds.
     */
    const delay =
      Math.min(
        15_000,
        1_000
          * 2
          ** Math.min(
            reconnectAttempt - 1,
            4,
          ),
      );

    try {
      await sleep(
        delay,
        signal,
      );
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      throw error;
    }
  }
}


/* =========================================================
   CONNECTION LIFECYCLE
========================================================= */

function cancelScheduledStop(): void {
  if (stopTimer === null) {
    return;
  }

  window.clearTimeout(
    stopTimer,
  );

  stopTimer = null;
}


function start(): void {
  if (typeof window === "undefined") {
    return;
  }

  cancelScheduledStop();

  if (
    running
    || listeners.size === 0
  ) {
    return;
  }

  running = true;
  reconnectAttempt = 0;
  connectionGeneration += 1;

  const generation =
    connectionGeneration;

  const activeController =
    new AbortController();

  controller =
    activeController;

  void connectionLoop(
    activeController.signal,
    generation,
  ).finally(
    () => {
      /**
       * An old connection may finish after a new connection has
       * started. Old cleanup must never reset the newer stream.
       */
      if (
        generation
        !== connectionGeneration
      ) {
        return;
      }

      if (
        controller
        === activeController
      ) {
        controller = null;
      }

      running = false;
    },
  );
}


function stopNow(): void {
  cancelScheduledStop();

  /**
   * Invalidate the current generation before aborting it.
   */
  connectionGeneration += 1;
  running = false;

  const activeController =
    controller;

  controller = null;

  activeController?.abort();

  reconnectAttempt = 0;

  emitStatus(
    "disconnected",
  );
}


function scheduleStop(): void {
  if (typeof window === "undefined") {
    return;
  }

  cancelScheduledStop();

  stopTimer =
    window.setTimeout(
      () => {
        stopTimer = null;

        if (listeners.size === 0) {
          stopNow();
        }
      },
      STOP_GRACE_MS,
    );
}


/* =========================================================
   PUBLIC SERVICE
========================================================= */

export const liveEventsService = {
  subscribe(
    listener: LiveEventListener,
  ): () => void {
    listeners.add(listener);

    /**
     * If React immediately remounted, cancel the pending
     * disconnect and keep the existing stream alive.
     */
    cancelScheduledStop();
    start();

    let subscribed = true;

    return () => {
      if (!subscribed) {
        return;
      }

      subscribed = false;
      listeners.delete(listener);

      if (listeners.size === 0) {
        scheduleStop();
      }
    };
  },

  stop(): void {
    listeners.clear();
    stopNow();
  },
};


/* =========================================================
   TYPE GUARD
========================================================= */

export function isMessageCreatedEvent(
  event: LiveEvent,
): event is MessageCreatedEvent {
  if (
    event.type !== "message.created"
    || !event.data
    || typeof event.data !== "object"
  ) {
    return false;
  }

  const data =
    event.data as
      Partial<LiveMessageCreatedData>;

  return (
    typeof data.inquiry_id
      === "string"
    && typeof data.message
      === "object"
    && data.message !== null
  );
}