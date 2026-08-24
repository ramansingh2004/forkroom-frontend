import { apiClient } from "@/lib/api/client";

export type MentionStatus = "all" | "unread";

export type MentionActor = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type MentionContext = {
  type: "decision_comment" | "proposal_comment" | "objection_comment";
  decision_id: string;
  decision_title: string;
  proposal_id: string | null;
  proposal_title: string | null;
  objection_id: string | null;
  objection_title: string | null;
};

export type Mention = {
  id: string;
  workspace_id: string;
  comment_id: string;
  mentioned_by: MentionActor;
  excerpt: string;
  context: MentionContext;
  href: string;
  created_at: string;
  read_at: string | null;
};

export type MentionList = {
  items: Mention[];
  unread_count: number;
  next_cursor: string | null;
};

export type MentionReadResult = {
  id: string;
  read_at: string | null;
};

export type MentionMarkAllReadResult = { updated: number };
export type MentionUnreadCount = { count: number };

export async function listMentions(
  workspaceId: string,
  status: MentionStatus,
  cursor?: string,
  limit = 30,
) {
  const { data } = await apiClient.get<MentionList>(
    `/workspaces/${workspaceId}/mentions`,
    { params: { status, cursor, limit } },
  );
  return data;
}

export async function getUnreadMentionCount() {
  const { data } = await apiClient.get<MentionUnreadCount>(
    "/mentions/unread-count",
  );
  return data;
}

export async function markMentionRead(workspaceId: string, mentionId: string) {
  const { data } = await apiClient.patch<MentionReadResult>(
    `/workspaces/${workspaceId}/mentions/${mentionId}/read`,
  );
  return data;
}

export async function markMentionUnread(
  workspaceId: string,
  mentionId: string,
) {
  const { data } = await apiClient.delete<MentionReadResult>(
    `/workspaces/${workspaceId}/mentions/${mentionId}/read`,
  );
  return data;
}

export async function markAllMentionsRead(workspaceId: string) {
  const { data } = await apiClient.post<MentionMarkAllReadResult>(
    `/workspaces/${workspaceId}/mentions/read-all`,
  );
  return data;
}
