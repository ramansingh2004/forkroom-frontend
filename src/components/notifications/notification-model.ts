import {
  IconAt,
  IconCalendarDue,
  IconCheckbox,
  IconClockHour4,
  IconScale,
} from "@tabler/icons-react";
import type {
  Notification,
  NotificationKind,
} from "@/services/notification.service";

export const notificationKindMeta: Record<
  NotificationKind,
  {
    label: string;
    color: "blue" | "orange" | "red" | "rust" | "violet";
    icon: typeof IconCheckbox;
  }
> = {
  action_due: {
    label: "Action due",
    color: "orange",
    icon: IconCheckbox,
  },
  decision_review: {
    label: "Review",
    color: "blue",
    icon: IconScale,
  },
  decision_deadline: {
    label: "Decision deadline",
    color: "red",
    icon: IconCalendarDue,
  },
  voting_close: {
    label: "Voting closes",
    color: "rust",
    icon: IconClockHour4,
  },
  mention: {
    label: "Mention",
    color: "violet",
    icon: IconAt,
  },
};

export function getNotificationDestination(notification: Notification) {
  if (notification.action_url) return notification.action_url;

  const workspacePath = `/w/${notification.workspace_id}`;

  if (notification.kind === "decision_deadline") {
    return `${workspacePath}/decisions/${notification.source_id}?from=notifications`;
  }

  // The current contract exposes an action, review, or voting-session source
  // id without its parent decision id. Keep those links valid and scoped to
  // the correct workspace until the API adds an explicit destination.
  return `${workspacePath}?from=notifications&notification=${notification.id}`;
}

export function formatNotificationTime(value: string) {
  const date = new Date(value);
  const difference = date.getTime() - Date.now();
  const absoluteDifference = Math.abs(difference);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absoluteDifference < 60_000) {
    return "just now";
  }

  if (absoluteDifference < 3_600_000) {
    return formatter.format(Math.round(difference / 60_000), "minute");
  }

  if (absoluteDifference < 86_400_000) {
    return formatter.format(Math.round(difference / 3_600_000), "hour");
  }

  if (absoluteDifference < 604_800_000) {
    return formatter.format(Math.round(difference / 86_400_000), "day");
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}
