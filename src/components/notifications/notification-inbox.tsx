"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  SegmentedControl,
  Select,
  Skeleton,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconBell,
  IconCheck,
  IconChecks,
  IconInbox,
  IconRefresh,
} from "@tabler/icons-react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationFeed,
} from "@/hooks/use-notifications";
import { getApiErrorMessage } from "@/services/auth.service";
import type {
  Notification,
  NotificationKind,
} from "@/services/notification.service";
import {
  formatNotificationTime,
  getNotificationDestination,
  notificationKindMeta,
} from "./notification-model";
import styles from "./notifications.module.css";

type InboxMode = "all" | "unread";
type KindFilter = "all" | NotificationKind;

const kindOptions: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "action_due", label: "Actions due" },
  { value: "decision_review", label: "Reviews" },
  { value: "decision_deadline", label: "Decision deadlines" },
  { value: "voting_close", label: "Voting closes" },
];

function NotificationRow({
  notification,
  onMarkRead,
  marking,
}: {
  notification: Notification;
  onMarkRead: (notification: Notification) => void;
  marking: boolean;
}) {
  const meta = notificationKindMeta[notification.kind];
  const Icon = meta.icon;
  const unread = notification.read_at === null;

  return (
    <article
      className={`${styles.notificationRow} ${
        unread ? styles.notificationUnread : ""
      }`}
    >
      <div className={styles.notificationIcon} data-color={meta.color}>
        <Icon size={20} stroke={1.8} aria-hidden="true" />
      </div>

      <div className={styles.notificationContent}>
        <div className={styles.notificationMeta}>
          <Badge variant="light" color={meta.color} size="sm">
            {meta.label}
          </Badge>
          <time dateTime={notification.created_at}>
            {formatNotificationTime(notification.created_at)}
          </time>
          {notification.status === "failed" && (
            <span className={styles.deliveryFailure}>Delivery failed</span>
          )}
        </div>

        <h2>{notification.title}</h2>
        <p>{notification.body}</p>
      </div>

      <div className={styles.notificationActions}>
        {unread && (
          <Tooltip label="Mark as read">
            <ActionIcon
              variant="subtle"
              color="dark"
              size={36}
              aria-label={`Mark ${notification.title} as read`}
              onClick={() => onMarkRead(notification)}
              loading={marking}
            >
              <IconCheck size={17} />
            </ActionIcon>
          </Tooltip>
        )}

        <Button
          component="a"
          href={getNotificationDestination(notification)}
          variant="default"
          size="xs"
          rightSection={<IconArrowUpRight size={15} />}
        >
          Open
        </Button>
      </div>
    </article>
  );
}

export function NotificationInbox() {
  const router = useRouter();
  const [mode, setMode] = useState<InboxMode>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const feed = useNotificationFeed(mode === "unread");
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const items = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  );
  const visibleItems = useMemo(
    () =>
      kindFilter === "all"
        ? items
        : items.filter((notification) => notification.kind === kindFilter),
    [items, kindFilter],
  );
  const firstPage = feed.data?.pages[0];
  const unreadCount = firstPage?.unread ?? 0;
  const totalCount = firstPage?.total ?? 0;

  const handleMarkRead = async (notification: Notification) => {
    try {
      await markRead.mutateAsync(notification.id);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Notification was not updated",
        message: getApiErrorMessage(
          error,
          "ForkRoom could not mark this notification as read.",
        ),
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const result = await markAllRead.mutateAsync();
      notifications.show({
        color: "green",
        title: "Inbox cleared",
        message:
          result.updated === 0
            ? "There were no unread notifications."
            : `${result.updated} notification${result.updated === 1 ? "" : "s"} marked as read.`,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Inbox was not updated",
        message: getApiErrorMessage(
          error,
          "ForkRoom could not mark all notifications as read.",
        ),
      });
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>PERSONAL / ATTENTION</span>
          <h1>Notifications</h1>
          <p>
            Review deadlines, voting windows, assigned work, and scheduled
            decision reviews that need your attention.
          </p>
        </div>

        <Button
          variant="default"
          leftSection={<IconChecks size={17} />}
          onClick={() => void handleMarkAllRead()}
          loading={markAllRead.isPending}
          disabled={unreadCount === 0 || !feed.data}
        >
          Mark all read
        </Button>
      </header>

      <section className={styles.summaryBar} aria-label="Notification summary">
        <div>
          <IconBell size={18} aria-hidden="true" />
          <span>UNREAD</span>
          <strong>{String(unreadCount).padStart(2, "0")}</strong>
        </div>
        <div>
          <span>IN THIS VIEW</span>
          <strong>{String(totalCount).padStart(2, "0")}</strong>
        </div>
        <span className={styles.refreshNote}>
          The inbox refreshes automatically while this page is open.
        </span>
      </section>

      <div className={styles.toolbar}>
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as InboxMode)}
          data={[
            { label: "All", value: "all" },
            { label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`, value: "unread" },
          ]}
          aria-label="Notification read-state filter"
        />

        <Select
          value={kindFilter}
          onChange={(value) => setKindFilter((value as KindFilter) ?? "all")}
          data={kindOptions}
          allowDeselect={false}
          aria-label="Notification category"
          className={styles.kindSelect}
        />
      </div>

      {feed.isError && feed.data && (
        <Alert
          color="orange"
          icon={<IconAlertTriangle size={18} />}
          title="Showing the last loaded inbox"
          className={styles.staleAlert}
        >
          ForkRoom could not refresh these notifications. Read state and the
          unread count may be stale.
        </Alert>
      )}

      {feed.isPending && !feed.data ? (
        <div className={styles.skeletonList} aria-label="Loading notifications">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} height={112} radius="sm" />
          ))}
        </div>
      ) : feed.isError && !feed.data ? (
        <div className={styles.statePanel}>
          <IconAlertTriangle size={28} />
          <strong>Notifications are unavailable</strong>
          <p>
            ForkRoom could not load your attention inbox. Check your connection
            and try again.
          </p>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void feed.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.statePanel}>
          <IconInbox size={30} />
          <strong>{mode === "unread" ? "You are all caught up" : "No notifications yet"}</strong>
          <p>
            {mode === "unread"
              ? "New attention items will appear here when work is assigned or a decision reaches a time-sensitive stage."
              : "ForkRoom will add personal alerts here when a deadline, vote, action, or review needs your awareness."}
          </p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className={styles.statePanel}>
          <IconInbox size={30} />
          <strong>No loaded notifications match this category</strong>
          <p>
            Choose another category or load older notifications to continue
            searching this inbox.
          </p>
        </div>
      ) : (
        <div className={styles.notificationList}>
          {visibleItems.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkRead={(item) => void handleMarkRead(item)}
              marking={
                markRead.isPending && markRead.variables === notification.id
              }
            />
          ))}
        </div>
      )}

      {feed.hasNextPage && (
        <Group justify="center" className={styles.loadMore}>
          <Button
            variant="default"
            onClick={() => void feed.fetchNextPage()}
            loading={feed.isFetchingNextPage}
          >
            Load older notifications
          </Button>
        </Group>
      )}

      {feed.isFetching && !feed.isFetchingNextPage && feed.data && (
        <div className={styles.backgroundRefresh} aria-live="polite">
          <Loader size="xs" color="rust" /> Refreshing inbox…
        </div>
      )}

      <Button
        variant="subtle"
        color="dark"
        className={styles.backButton}
        onClick={() => router.back()}
      >
        Return to previous page
      </Button>
    </div>
  );
}
