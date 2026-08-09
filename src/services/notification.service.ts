import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/api-types";

export type Notification = components["schemas"]["NotificationResponse"];
export type NotificationKind = components["schemas"]["NotificationKind"];
export type NotificationList =
  components["schemas"]["NotificationListResponse"];
export type UnreadCount = components["schemas"]["UnreadCountResponse"];
export type MarkAllReadResult =
  components["schemas"]["MarkAllReadResponse"];

export type NotificationListQuery = {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
};

export async function listNotifications(query: NotificationListQuery = {}) {
  const { data } = await apiClient.get<NotificationList>("/notifications", {
    params: {
      unread_only: query.unreadOnly || undefined,
      limit: query.limit,
      offset: query.offset,
    },
  });

  return data;
}

export async function getUnreadNotificationCount() {
  const { data } = await apiClient.get<UnreadCount>(
    "/notifications/unread-count",
  );

  return data;
}

export async function markNotificationRead(notificationId: string) {
  const { data } = await apiClient.post<Notification>(
    `/notifications/${notificationId}/read`,
  );

  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.post<MarkAllReadResult>(
    "/notifications/read-all",
  );

  return data;
}
