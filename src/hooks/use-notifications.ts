"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationListQuery,
} from "@/services/notification.service";

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (query: NotificationListQuery) =>
    [
      ...notificationKeys.lists(),
      query.unreadOnly ? "unread" : "all",
      query.limit ?? "default-limit",
      query.offset ?? "first-page",
    ] as const,
  feed: (unreadOnly: boolean, pageSize: number) =>
    [
      ...notificationKeys.lists(),
      "feed",
      unreadOnly ? "unread" : "all",
      pageSize,
    ] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

export function useNotifications(query: NotificationListQuery = {}) {
  return useQuery({
    queryKey: notificationKeys.list(query),
    queryFn: () => listNotifications(query),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useNotificationFeed(
  unreadOnly: boolean,
  pageSize = 20,
) {
  return useInfiniteQuery({
    queryKey: notificationKeys.feed(unreadOnly, pageSize),
    queryFn: ({ pageParam }) =>
      listNotifications({
        unreadOnly,
        limit: pageSize,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadNotificationCount,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

async function refreshNotificationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: notificationKeys.lists() }),
    queryClient.invalidateQueries({
      queryKey: notificationKeys.unreadCount(),
    }),
  ]);
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => refreshNotificationQueries(queryClient),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => refreshNotificationQueries(queryClient),
  });
}
