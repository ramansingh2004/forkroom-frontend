import axios from "axios";

type FastApiValidationError = {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
};

type ApiErrorBody = {
  detail?: string | FastApiValidationError[];
};

export type ApiErrorContext =
  | "attachment-download"
  | "attachment-upload"
  | "decision-transition"
  | "export-download"
  | "export-request"
  | "member-management"
  | "open-voting"
  | "close-voting"
  | "create-voting-round"
  | "vote";

type ApiErrorKind =
  | "conflict"
  | "forbidden"
  | "network"
  | "not-found"
  | "rate-limit"
  | "server"
  | "timeout"
  | "validation"
  | "unknown";

export type ApiErrorInfo = {
  kind: ApiErrorKind;
  message: string;
  retryable: boolean;
  status?: number;
};

const knownDetailMessages: Record<string, string> = {
  "Resolve every blocking objection before opening voting":
    "Resolve every blocking objection before opening voting.",
  "You have already voted in this session":
    "Your vote is already recorded for this round. Refresh the voting panel before trying again.",
  "Voting results are available only after the session closes":
    "Close the voting round before viewing its result.",
  "The voting session is not accepting ballots":
    "This voting round is no longer accepting ballots. Refresh to see its current state.",
  "The requested decision state or schedule is invalid":
    "This decision has changed and that transition is no longer available. Refresh the Decision Room to continue.",
  "Closed, locked, or archived decisions cannot be changed":
    "This decision is read-only because it has been closed, locked, or archived.",
  "The proposal or its parent decision cannot be changed":
    "This proposal is read-only in the decision's current lifecycle state.",
  "The requested proposal state or criterion order is invalid":
    "This proposal has changed and that action is no longer valid. Refresh the Decision Room.",
  "The objection, proposal, or decision cannot be changed":
    "This objection is read-only in the decision's current lifecycle state.",
  "The requested objection status transition is invalid":
    "This objection has changed and that status action is no longer valid. Refresh the Decision Room.",
  "Attachment exceeds the configured size limit":
    "This file is larger than the workspace upload limit. Choose a smaller file and try again.",
  "Attachment target is invalid or outside this workspace":
    "The selected proposal is no longer available for this attachment. Choose another target and retry.",
  "Attachment is not in the required lifecycle state":
    "This attachment changed state before the action completed. Refresh the evidence panel and try again.",
  "The decision export is not available or its source is invalid":
    "This export is not ready or no longer matches the locked decision. Refresh its status before downloading.",
  "Implementation actions and reviews require a locked decision":
    "Lock this decision before creating implementation actions or scheduling a review.",
  "The assignee must be an eligible workspace participant":
    "Choose an owner, administrator, or member who still belongs to this workspace.",
  "The decision already has a scheduled review":
    "This decision already has a scheduled review. Open the existing review to reschedule it.",
  "The decision review is not due yet":
    "This review is not due yet. Wait until its scheduled date before recording an outcome.",
  "User is already a workspace member":
    "This person already belongs to the workspace.",
  "The workspace owner cannot be removed or assigned another role":
    "The workspace owner cannot be removed or assigned another role.",
  "Verify your email before logging in":
    "Verify your email before signing in. You can request a fresh verification link from the verification page.",
  "Invalid email or password": "The email or password is incorrect.",
};

function validationMessage(detail: FastApiValidationError[]) {
  const issue = detail.find((item) => item.msg);
  if (!issue?.msg) return null;

  const field = issue.loc?.at(-1);
  return typeof field === "string"
    ? `${field.replaceAll("_", " ")}: ${issue.msg}`
    : issue.msg;
}

function contextualConflict(context: ApiErrorContext | undefined) {
  switch (context) {
    case "create-voting-round":
      return "Activate this decision before creating a voting round. If it is already active, refresh to load its latest voting state.";
    case "open-voting":
      return "This round cannot be opened in its current state. Refresh the Decision Room, then review the voting-readiness checks.";
    case "close-voting":
      return "This round is no longer open. Refresh to load the latest voting result.";
    case "vote":
      return "This ballot can no longer be recorded. Refresh to see whether voting has closed or your vote is already saved.";
    default:
      return "The voting state changed before this action completed. Refresh the Decision Room and use the next available lifecycle action.";
  }
}

export function getApiErrorInfo(
  error: unknown,
  fallback: string,
  context?: ApiErrorContext,
): ApiErrorInfo {
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return {
      kind: "network",
      message: error.message || fallback,
      retryable: true,
    };
  }

  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return { kind: "unknown", message: fallback, retryable: true };
  }

  if (error.code === "ECONNABORTED") {
    return {
      kind: "timeout",
      message:
        "The server took too long to respond. Your action was not confirmed; check the current state before retrying.",
      retryable: true,
    };
  }

  if (!error.response) {
    return {
      kind: "network",
      message:
        typeof navigator !== "undefined" && !navigator.onLine
          ? "You are offline. ForkRoom will reconnect automatically; server actions remain unavailable until then."
          : "ForkRoom could not reach the server. Check your connection and retry without leaving this page.",
      retryable: true,
    };
  }

  const status = error.response.status;
  const detail = error.response.data?.detail;
  const detailMessage =
    typeof detail === "string"
      ? detail.trim()
      : Array.isArray(detail)
        ? validationMessage(detail)
        : null;

  if (status === 401) {
    return {
      kind: "forbidden",
      message: "Your session has expired. Sign in again to continue.",
      retryable: false,
      status,
    };
  }

  if (status === 403) {
    return {
      kind: "forbidden",
      message:
        context === "member-management"
          ? "Only the workspace owner or an administrator can change member access."
          : detailMessage ||
            "Your workspace role does not allow this action. The current content remains available read-only.",
      retryable: false,
      status,
    };
  }

  if (status === 404) {
    return {
      kind: "not-found",
      message:
        detailMessage ||
        "This item was removed or is no longer available to your account.",
      retryable: false,
      status,
    };
  }

  if (status === 409) {
    const message =
      detailMessage === "The requested voting session state is invalid"
        ? contextualConflict(context)
        : (detailMessage && knownDetailMessages[detailMessage]) ||
          detailMessage ||
          "This item changed before the action completed. Refresh it and try the action again.";
    return { kind: "conflict", message, retryable: true, status };
  }

  if (status === 422) {
    return {
      kind: "validation",
      message: detailMessage || "Review the highlighted values and try again.",
      retryable: false,
      status,
    };
  }

  if (status === 429) {
    return {
      kind: "rate-limit",
      message: "Too many attempts. Wait a moment, then try again.",
      retryable: true,
      status,
    };
  }

  if (status >= 500) {
    return {
      kind: "server",
      message:
        context === "attachment-upload"
          ? "ForkRoom could not prepare the upload. Retry or contact a workspace administrator."
          : "ForkRoom reached the server, but it could not complete this request. Retry once; if it continues, contact a workspace administrator.",
      retryable: true,
      status,
    };
  }

  return {
    kind: "unknown",
    message:
      (detailMessage && knownDetailMessages[detailMessage]) ||
      detailMessage ||
      fallback,
    retryable: true,
    status,
  };
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  context?: ApiErrorContext,
) {
  return getApiErrorInfo(error, fallback, context).message;
}

export function getApiStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount >= 2) return false;
  const status = getApiStatus(error);
  return (
    status === undefined || status === 408 || status === 429 || status >= 500
  );
}