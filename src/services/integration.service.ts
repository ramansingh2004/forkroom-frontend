import axios from "axios";

import { apiClient } from "@/lib/api/client";

export type IntegrationProviderName = "slack";

export type IntegrationConnectionStatus =
  | "pending"
  | "active"
  | "expired"
  | "revoked"
  | "error";

export type IntegrationEventType =
  | "decision_activated"
  | "voting_opened"
  | "voting_closed"
  | "decision_locked";

export type IntegrationProvider = {
  provider: IntegrationProviderName;
  name: string;
  description: string;
  available: boolean;
  capabilities: string[];
};

export type IntegrationConnection = {
  id: string;
  workspace_id: string;
  provider: IntegrationProviderName;
  status: IntegrationConnectionStatus;
  external_account_id: string;
  external_account_name: string;
  scopes: string[];
  configuration: Record<string, unknown>;
  connected_by_id: string;
  token_expires_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationDestination = {
  id: string;
  name: string;
  type: string;
};

export type IntegrationSubscription = {
  id: string;
  connection_id: string;
  event_type: IntegrationEventType;
  enabled: boolean;
  destination_id: string | null;
  destination_name: string | null;
  configuration: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type IntegrationSubscriptionUpdate = {
  event_type: IntegrationEventType;
  enabled: boolean;
  destination_id: string | null;
  destination_name: string | null;
  configuration: Record<string, unknown>;
};

type ListResponse<T> = { items: T[] };

type IntegrationAuthorizationResponse = {
  authorization_url: string;
  expires_at: string;
};

export async function listIntegrationProviders() {
  const { data } = await apiClient.get<ListResponse<IntegrationProvider>>(
    "/integrations/providers",
  );
  return data.items;
}

export async function listWorkspaceIntegrations(workspaceId: string) {
  const { data } = await apiClient.get<ListResponse<IntegrationConnection>>(
    `/workspaces/${workspaceId}/integrations`,
  );
  return data.items;
}

export async function authorizeIntegration(
  workspaceId: string,
  provider: IntegrationProviderName,
) {
  const { data } = await apiClient.post<IntegrationAuthorizationResponse>(
    `/workspaces/${workspaceId}/integrations/${provider}/authorize`,
    { return_path: `/w/${workspaceId}/integrations` },
  );
  return data;
}

export async function listIntegrationDestinations(
  workspaceId: string,
  connectionId: string,
) {
  const { data } = await apiClient.get<ListResponse<IntegrationDestination>>(
    `/workspaces/${workspaceId}/integrations/${connectionId}/destinations`,
  );
  return data.items;
}

export async function listIntegrationSubscriptions(
  workspaceId: string,
  connectionId: string,
) {
  const { data } = await apiClient.get<ListResponse<IntegrationSubscription>>(
    `/workspaces/${workspaceId}/integrations/${connectionId}/subscriptions`,
  );
  return data.items;
}

export async function updateIntegrationSubscriptions(
  workspaceId: string,
  connectionId: string,
  items: IntegrationSubscriptionUpdate[],
) {
  const { data } = await apiClient.patch<ListResponse<IntegrationSubscription>>(
    `/workspaces/${workspaceId}/integrations/${connectionId}/subscriptions`,
    { items },
  );
  return data.items;
}

export async function testIntegration(
  workspaceId: string,
  connectionId: string,
  destinationId: string | null,
) {
  await apiClient.post(
    `/workspaces/${workspaceId}/integrations/${connectionId}/test`,
    { destination_id: destinationId },
  );
}

export async function disconnectIntegration(
  workspaceId: string,
  connectionId: string,
) {
  await apiClient.delete(
    `/workspaces/${workspaceId}/integrations/${connectionId}`,
  );
}

const integrationErrorByStatus: Record<number, string> = {
  401: "Your session has expired. Sign in again to continue.",
  403: "Only workspace owners and administrators can manage integrations.",
  404: "This integration connection is no longer available.",
  409: "Review the selected channel and notification settings, then try again.",
  502: "Slack rejected the request or could not be reached.",
  503: "Slack is not fully configured on the ForkRoom server.",
};

export function getIntegrationErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<{ detail?: unknown }>(error)) return fallback;
  if (!error.response) {
    return typeof navigator !== "undefined" && !navigator.onLine
      ? "You are offline. Reconnect before changing the Slack integration."
      : "ForkRoom could not reach the API. Check your connection and retry.";
  }

  const status = error.response.status;
  const detail = error.response.data?.detail;
  if ([409, 502, 503].includes(status) && typeof detail === "string") {
    return detail;
  }
  return (
    integrationErrorByStatus[status] ??
    (typeof detail === "string" && detail.trim() ? detail : fallback)
  );
}
