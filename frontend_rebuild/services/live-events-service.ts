import {
  API_BASE_URL,
  getAccessToken,
  refreshAccessToken,
} from "@/lib/api";


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


/* =========================================================
   SINGLETON STATE

   All subscribers share ONE SSE connection.
========================================================= */

const listeners =
  new Set<LiveEventListener>();

let controller:
  | AbortController
  | null = null;

let running = false;

let reconnectAttempt = 0;


/* =========================================================
   HELPERS
========================================================= */

function emitStatus(
  status:
    | "connecting"
    | "connected"
    | "disconnected",
): void {
  if (
    typeof window ===
    "undefined"
  ) {
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
  for (
    const listener
    of listeners
  ) {
    try {
      listener(event);
    } catch {
      // One UI listener must never
      // break delivery to others.
    }
  }

  if (
    typeof window !==
    "undefined"
  ) {
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


function isAbortError(
  error: unknown,
): boolean {
  return (
    error instanceof DOMException &&
    error.name ===
      "AbortError"
  );
}


function sleep(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      if (
        signal.aborted
      ) {
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
   AUTHENTICATED REQUEST
========================================================= */

async function openAuthenticatedStream(
  signal: AbortSignal,
): Promise<Response> {
  let token =
    getAccessToken();


  /*
   * A hard browser refresh clears the in-memory access token.
   * If Dashboard auth has not restored it yet, use the existing
   * refresh-cookie flow once.
   */
  if (!token) {
    const refreshed =
      await refreshAccessToken();

    token =
      refreshed.access_token;
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

          signal,
        },
      );


  let response =
    await request(
      token,
    );


  /*
   * Access token may expire while the app is open.
   * Refresh ONCE and reconnect with the new token.
   */
  if (
    response.status ===
    401
  ) {
    const refreshed =
      await refreshAccessToken();

    response =
      await request(
        refreshed.access_token,
      );
  }


  return response;
}


/* =========================================================
   SSE PARSER
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


  for (
    const rawLine
    of lines
  ) {
    const line =
      rawLine.trimEnd();


    if (
      !line ||
      line.startsWith(":")
    ) {
      continue;
    }


    if (
      line.startsWith(
        "event:",
      )
    ) {
      eventName =
        line
          .slice(6)
          .trim();

      continue;
    }


    if (
      line.startsWith(
        "data:",
      )
    ) {
      dataLines.push(
        line
          .slice(5)
          .trimStart(),
      );
    }
  }


  if (
    dataLines.length ===
    0
  ) {
    return null;
  }


  return {
    eventName,
    data:
      dataLines.join(
        "\n",
      ),
  };
}


function handleBlock(
  block: string,
): void {
  const parsed =
    parseBlock(
      block,
    );


  if (!parsed) {
    return;
  }


  try {
    const payload =
      JSON.parse(
        parsed.data,
      ) as LiveEvent;


    if (
      payload.type ===
      "connected"
    ) {
      emitStatus(
        "connected",
      );

      reconnectAttempt =
        0;

      return;
    }


    emitEvent(
      payload,
    );
  } catch {
    // Ignore malformed stream events.
    // A single bad event should not terminate
    // the persistent connection.
  }
}


/* =========================================================
   READ ONE STREAM
========================================================= */

async function consumeStream(
  signal: AbortSignal,
): Promise<void> {
  emitStatus(
    "connecting",
  );


  const response =
    await openAuthenticatedStream(
      signal,
    );


  if (
    !response.ok
  ) {
    throw new Error(
      `Live event stream returned HTTP ${response.status}.`,
    );
  }


  if (
    !response.body
  ) {
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
    while (
      !signal.aborted
    ) {
      const {
        done,
        value,
      } =
        await reader.read();


      if (done) {
        break;
      }


      buffer +=
        decoder
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
        buffer.indexOf(
          "\n\n",
        );


      while (
        separatorIndex !==
        -1
      ) {
        const block =
          buffer.slice(
            0,
            separatorIndex,
          );

        buffer =
          buffer.slice(
            separatorIndex +
              2,
          );


        handleBlock(
          block,
        );


        separatorIndex =
          buffer.indexOf(
            "\n\n",
          );
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Ignore cleanup errors.
    }

    reader.releaseLock();
  }
}


/* =========================================================
   CONNECTION LOOP

   Reconnects only when the persistent stream actually dies.
   This is NOT polling.
========================================================= */

async function connectionLoop(
  signal: AbortSignal,
): Promise<void> {
  while (
    running &&
    listeners.size > 0 &&
    !signal.aborted
  ) {
    try {
      await consumeStream(
        signal,
      );


      if (
        signal.aborted ||
        !running
      ) {
        return;
      }


      emitStatus(
        "disconnected",
      );
    } catch (
      error
    ) {
      if (
        signal.aborted ||
        isAbortError(
          error,
        )
      ) {
        return;
      }


      emitStatus(
        "disconnected",
      );
    }


    reconnectAttempt +=
      1;


    /*
     * 1s → 2s → 4s → 8s → max 15s.
     *
     * This only runs after a broken connection,
     * not continuously during normal operation.
     */
    const delay =
      Math.min(
        15_000,
        1_000 *
          2 **
            Math.min(
              reconnectAttempt -
                1,
              4,
            ),
      );


    try {
      await sleep(
        delay,
        signal,
      );
    } catch (
      error
    ) {
      if (
        isAbortError(
          error,
        )
      ) {
        return;
      }

      throw error;
    }
  }
}


/* =========================================================
   START / STOP
========================================================= */

function start(): void {
  if (
    typeof window ===
      "undefined" ||
    running ||
    listeners.size ===
      0
  ) {
    return;
  }


  running = true;

  controller =
    new AbortController();


  void connectionLoop(
    controller.signal,
  ).finally(() => {
    running =
      false;

    controller =
      null;
  });
}


function stop(): void {
  running =
    false;

  controller?.abort();

  controller =
    null;

  reconnectAttempt =
    0;

  emitStatus(
    "disconnected",
  );
}


/* =========================================================
   PUBLIC SERVICE
========================================================= */

export const liveEventsService = {
  subscribe(
    listener: LiveEventListener,
  ): () => void {
    listeners.add(
      listener,
    );


    start();


    return () => {
      listeners.delete(
        listener,
      );


      /*
       * No subscribers = no reason to keep an open
       * network connection.
       */
      if (
        listeners.size ===
        0
      ) {
        stop();
      }
    };
  },


  stop(): void {
    listeners.clear();

    stop();
  },
};


/* =========================================================
   TYPE GUARD
========================================================= */

export function isMessageCreatedEvent(
  event: LiveEvent,
): event is MessageCreatedEvent {
  if (
    event.type !==
      "message.created" ||
    !event.data ||
    typeof event.data !==
      "object"
  ) {
    return false;
  }


  const data =
    event.data as
      Partial<LiveMessageCreatedData>;


  return (
    typeof data.inquiry_id ===
      "string" &&
    typeof data.message ===
      "object" &&
    data.message !==
      null
  );
}