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

  const detail = error.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((issue) => issue.msg)
      .filter((message): message is string => Boolean(message))
      .join(" ");
  }

  if (error.code === "ECONNABORTED") {
    return "The server took too long to respond. Please try again.";
  }

  if (!error.response) {
    return "HomeLink could not reach the backend. Confirm that FastAPI is running on port 8001.";
  }

  if (error.response.status === 429) {
    return "Too many attempts. Please wait before trying again.";
  }

  if (error.response.status === 503) {
    return "HomeLink security services are temporarily unavailable.";
  }

  return fallback;
}