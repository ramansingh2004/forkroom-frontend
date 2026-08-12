import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/api-types";

export type MeetingToken = components["schemas"]["MeetingTokenResponse"];
export type MeetingPermission = components["schemas"]["MeetingPermission"];
export type MeetingIceServer = components["schemas"]["IceServer"];

export async function issueMeetingToken(
  workspaceId: string,
  decisionId: string,
) {
  const { data } = await apiClient.post<MeetingToken>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/meeting-token`,
  );

  return data;
}