"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createDecisionComment,
  deleteDecisionComment,
  listDecisionComments,
  updateDecisionComment,
  type CommentCreateRequest,
  type CommentUpdateRequest,
} from "@/services/comment.service";
import { mentionKeys } from "@/hooks/use-mentions";

const PAGE_SIZE = 50;

export const commentKeys = {
  all: ["comments"] as const,
  decision: (workspaceId: string, decisionId: string) =>
    [...commentKeys.all, workspaceId, decisionId] as const,
};

export function useDecisionComments(workspaceId: string, decisionId: string) {
  return useInfiniteQuery({
    queryKey: commentKeys.decision(workspaceId, decisionId),
    queryFn: ({ pageParam }) =>
      listDecisionComments(workspaceId, decisionId, PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === PAGE_SIZE
        ? pages.reduce((total, page) => total + page.length, 0)
        : undefined,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

async function refreshDiscussion(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  decisionId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: commentKeys.decision(workspaceId, decisionId),
    }),
    queryClient.invalidateQueries({ queryKey: mentionKeys.all }),
  ]);
}

export function useCreateDecisionComment(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommentCreateRequest) =>
      createDecisionComment(workspaceId, decisionId, payload),
    onSuccess: async () =>
      refreshDiscussion(queryClient, workspaceId, decisionId),
  });
}

export function useUpdateDecisionComment(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      commentId,
      payload,
    }: {
      commentId: string;
      payload: CommentUpdateRequest;
    }) => updateDecisionComment(workspaceId, commentId, payload),
    onSuccess: async () =>
      refreshDiscussion(queryClient, workspaceId, decisionId),
  });
}

export function useDeleteDecisionComment(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      deleteDecisionComment(workspaceId, commentId),
    onSuccess: async () =>
      refreshDiscussion(queryClient, workspaceId, decisionId),
  });
}
