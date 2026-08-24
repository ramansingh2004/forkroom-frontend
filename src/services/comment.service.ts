import { apiClient } from "@/lib/api/client";

export type CommentTextNode = { type: "text"; text: string };
export type CommentMentionNode = {
  type: "mention";
  user_id: string;
  label: string;
};
export type CommentNode = CommentTextNode | CommentMentionNode;
export type StructuredCommentBody = { content: CommentNode[] };

export type CommentAuthor = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type DecisionComment = {
  id: string;
  workspace_id: string;
  decision_id: string;
  proposal_id: string | null;
  objection_id: string | null;
  author: CommentAuthor;
  body: string;
  structured_body: StructuredCommentBody;
  created_at: string;
  updated_at: string;
};

export type CommentCreateRequest = {
  body: string;
  structured_body: StructuredCommentBody;
  proposal_id?: string | null;
  objection_id?: string | null;
};

export type CommentUpdateRequest = Pick<
  CommentCreateRequest,
  "body" | "structured_body"
>;

export async function listDecisionComments(
  workspaceId: string,
  decisionId: string,
  limit = 50,
  offset = 0,
) {
  const { data } = await apiClient.get<DecisionComment[]>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/comments`,
    { params: { limit, offset } },
  );
  return data;
}

export async function createDecisionComment(
  workspaceId: string,
  decisionId: string,
  payload: CommentCreateRequest,
) {
  const { data } = await apiClient.post<DecisionComment>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/comments`,
    payload,
  );
  return data;
}

export async function updateDecisionComment(
  workspaceId: string,
  commentId: string,
  payload: CommentUpdateRequest,
) {
  const { data } = await apiClient.patch<DecisionComment>(
    `/workspaces/${workspaceId}/comments/${commentId}`,
    payload,
  );
  return data;
}

export async function deleteDecisionComment(
  workspaceId: string,
  commentId: string,
) {
  await apiClient.delete(`/workspaces/${workspaceId}/comments/${commentId}`);
}
