import axios from "axios";

interface FastApiValidationIssue {
  loc?: Array<string | number>;
  msg?: string;
}

interface FastApiErrorBody {
  detail?: string | FastApiValidationIssue[];
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!axios.isAxiosError<FastApiErrorBody>(error)) {
    return error instanceof Error && error.message
      ? error.message
      : fallback;
  }

  const detail =
    error.response?.data?.detail;

  if (
    typeof detail ===
      "string" &&
    detail.trim()
  ) {
    return detail;
  }

  if (
    Array.isArray(
      detail,
    ) &&
    detail.length >
      0
  ) {
    const message =
      detail
        .map(
          (
            issue,
          ) =>
            issue.msg,
        )
        .filter(
          (
            item,
          ): item is string =>
            Boolean(
              item,
            ),
        )
        .join(
          " ",
        );

    if (
      message
    ) {
      return message;
    }
  }

  if (
    error.code ===
    "ECONNABORTED"
  ) {
    return "The server took too long to respond. Please try again.";
  }

  if (
    !error.response
  ) {
    if (
      process.env
        .NODE_ENV ===
      "development"
    ) {
      return (
        "HomeLink could not reach the local API. " +
        "Confirm the backend is running and try again."
      );
    }

    return (
      "HomeLink could not reach the server. " +
      "Check your connection and try again."
    );
  }

  if (
    error.response
      .status ===
    402
  ) {
    return (
      typeof detail ===
        "string" &&
      detail.trim()
        ? detail
        : "A posting credit is required before this listing can be submitted."
    );
  }

  if (
    error.response
      .status ===
    429
  ) {
    return "Too many attempts. Please wait before trying again.";
  }

  if (
    error.response
      .status ===
    503
  ) {
    return "HomeLink is temporarily unavailable. Please try again shortly.";
  }

  return fallback;
}