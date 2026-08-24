"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getUnreadMentionCount,
  listMentions,
  markAllMentionsRead,
  markMentionRead,
  markMentionUnread,
  type MentionStatus,
} from "@/services/mention.service";
import { notificationKeys } from "@/hooks/use-notifications";

export const mentionKeys = {
  all: ["mentions"] as const,
  feeds: () => [...mentionKeys.all, "feed"] as const,
  feed: (workspaceId: string, status: MentionStatus, pageSize: number) =>
    [...mentionKeys.feeds(), workspaceId, status, pageSize] as const,
  unreadCount: () => [...mentionKeys.all, "unread-count"] as const,
};

export function useMentionFeed(
  workspaceId: string,
  status: MentionStatus,
  pageSize = 30,
) {
  return useInfiniteQuery({
    queryKey: mentionKeys.feed(workspaceId, status, pageSize),
    queryFn: ({ pageParam }) =>
      listMentions(workspaceId, status, pageParam, pageSize),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
}

export function useUnreadMentionCount() {
  return useQuery({
    queryKey: mentionKeys.unreadCount(),
    queryFn: getUnreadMentionCount,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

async function refreshMentionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: mentionKeys.feeds() }),
    queryClient.invalidateQueries({ queryKey: mentionKeys.unreadCount() }),
    queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  ]);
}

export function useMarkMentionRead(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mentionId: string) => markMentionRead(workspaceId, mentionId),
    onSuccess: async () => refreshMentionQueries(queryClient),
  });
}

export function useMarkMentionUnread(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mentionId: string) =>
      markMentionUnread(workspaceId, mentionId),
    onSuccess: async () => refreshMentionQueries(queryClient),
  });
}

export function useMarkAllMentionsRead(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllMentionsRead(workspaceId),
    onSuccess: async () => refreshMentionQueries(queryClient),
  });
}
