"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Group,
  Loader,
  SegmentedControl,
  Skeleton,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconAt,
  IconCheck,
  IconChecks,
  IconInbox,
  IconMailOpened,
  IconRefresh,
} from "@tabler/icons-react";

import {
  useMarkAllMentionsRead,
  useMarkMentionRead,
  useMarkMentionUnread,
  useMentionFeed,
} from "@/hooks/use-mentions";
import { getApiErrorMessage } from "@/services/auth.service";
import type { Mention, MentionStatus } from "@/services/mention.service";

import styles from "./mentions.module.css";

function formatMentionTime(value: string) {
  const date = new Date(value);
  const difference = date.getTime() - Date.now();
  const absoluteDifference = Math.abs(difference);
  const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absoluteDifference < 60_000) return "just now";
  if (absoluteDifference < 3_600_000) {
    return relative.format(Math.round(difference / 60_000), "minute");
  }
  if (absoluteDifference < 86_400_000) {
    return relative.format(Math.round(difference / 3_600_000), "hour");
  }
  if (absoluteDifference < 604_800_000) {
    return relative.format(Math.round(difference / 86_400_000), "day");
  }
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

function contextLabel(mention: Mention) {
  if (mention.context.type === "proposal_comment") {
    return mention.context.proposal_title
      ? `Proposal · ${mention.context.proposal_title}`
      : "Proposal discussion";
  }
  if (mention.context.type === "objection_comment") {
    return mention.context.objection_title
      ? `Objection · ${mention.context.objection_title}`
      : "Objection discussion";
  }
  return "Decision discussion";
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "FR"
  );
}

export function MentionsPage({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<MentionStatus>("all");
  const feed = useMentionFeed(workspaceId, status);
  const markRead = useMarkMentionRead(workspaceId);
  const markUnread = useMarkMentionUnread(workspaceId);
  const markAllRead = useMarkAllMentionsRead(workspaceId);
  const items = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  );
  const unreadCount = feed.data?.pages[0]?.unread_count ?? 0;

  const showMutationError = (error: unknown) => {
    notifications.show({
      color: "red",
      title: "Mention was not updated",
      message: getApiErrorMessage(
        error,
        "ForkRoom could not update this mention. Refresh and try again.",
      ),
    });
  };

  const openMention = async (mention: Mention) => {
    if (!mention.read_at) {
      try {
        await markRead.mutateAsync(mention.id);
      } catch (error) {
        showMutationError(error);
      }
    }
    router.push(mention.href);
  };

  const toggleReadState = async (mention: Mention) => {
    try {
      if (mention.read_at) await markUnread.mutateAsync(mention.id);
      else await markRead.mutateAsync(mention.id);
    } catch (error) {
      showMutationError(error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const result = await markAllRead.mutateAsync();
      notifications.show({
        color: "green",
        title: "Mentions cleared",
        message:
          result.updated === 0
            ? "There were no unread mentions."
            : `${result.updated} mention${result.updated === 1 ? "" : "s"} marked as read.`,
      });
    } catch (error) {
      showMutationError(error);
    }
  };

  return (
    <div className={styles.mentionsSurface}>
      <div className={styles.summaryBar} aria-label="Mention summary">
        <div>
          <IconAt size={18} aria-hidden="true" />
          <span>UNREAD</span>
          <strong>{String(unreadCount).padStart(2, "0")}</strong>
        </div>
        <span className={styles.refreshNote}>
          Your mention inbox refreshes automatically while ForkRoom is open.
        </span>
        <Tooltip
          label={
            unreadCount === 0
              ? "There are no unread mentions."
              : "Mark every unread mention in this workspace as read."
          }
        >
          <span>
            <Button
              variant="default"
              leftSection={<IconChecks size={17} />}
              onClick={() => void handleMarkAllRead()}
              loading={markAllRead.isPending}
              disabled={unreadCount === 0 || !feed.data}
            >
              Mark all read
            </Button>
          </span>
        </Tooltip>
      </div>

      <div className={styles.toolbar}>
        <SegmentedControl
          value={status}
          onChange={(value) => setStatus(value as MentionStatus)}
          data={[
            { label: "All", value: "all" },
            {
              label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`,
              value: "unread",
            },
          ]}
          aria-label="Mention read-state filter"
        />
      </div>

      {feed.isError && feed.data && (
        <Alert
          color="orange"
          icon={<IconAlertTriangle size={18} />}
          title="Showing the last loaded mentions"
        >
          {getApiErrorMessage(
            feed.error,
            "ForkRoom could not refresh this mention inbox.",
          )}
          <Button
            mt="sm"
            size="compact-sm"
            variant="default"
            onClick={() => void feed.refetch()}
          >
            Retry refresh
          </Button>
        </Alert>
      )}

      {feed.isPending && !feed.data ? (
        <div className={styles.skeletonList} aria-label="Loading mentions">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} height={126} radius="sm" />
          ))}
        </div>
      ) : feed.isError && !feed.data ? (
        <section className={styles.statePanel}>
          <IconAlertTriangle size={29} />
          <strong>Mentions are unavailable</strong>
          <p>
            {getApiErrorMessage(
              feed.error,
              "ForkRoom could not load your workspace mentions.",
            )}
          </p>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void feed.refetch()}
          >
            Retry
          </Button>
        </section>
      ) : items.length === 0 ? (
        <section className={styles.statePanel}>
          {status === "unread" ? <IconMailOpened size={30} /> : <IconInbox size={30} />}
          <strong>
            {status === "unread" ? "You are all caught up" : "No mentions yet"}
          </strong>
          <p>
            {status === "unread"
              ? "New unread mentions will appear here when someone requests your attention."
              : "When a workspace member mentions you in a Decision Room comment, it will appear here."}
          </p>
        </section>
      ) : (
        <section className={styles.mentionList} aria-label="Workspace mentions">
          {items.map((mention) => {
            const unread = mention.read_at === null;
            const toggling =
              (markRead.isPending && markRead.variables === mention.id) ||
              (markUnread.isPending && markUnread.variables === mention.id);
            return (
              <article
                key={mention.id}
                className={`${styles.mentionRow} ${unread ? styles.mentionUnread : ""}`}
              >
                <Avatar
                  src={mention.mentioned_by.avatar_url}
                  color="rust"
                  radius="xl"
                  size={38}
                >
                  {initials(mention.mentioned_by.display_name)}
                </Avatar>
                <div className={styles.mentionContent}>
                  <div className={styles.mentionMeta}>
                    <Badge variant="light" color="violet" size="sm">
                      Mention
                    </Badge>
                    <span>{contextLabel(mention)}</span>
                    <time dateTime={mention.created_at}>
                      {formatMentionTime(mention.created_at)}
                    </time>
                  </div>
                  <h2>
                    {mention.mentioned_by.display_name} mentioned you in {" "}
                    <span>{mention.context.decision_title}</span>
                  </h2>
                  <p>{mention.excerpt}</p>
                </div>
                <div className={styles.rowActions}>
                  <Tooltip label={unread ? "Mark as read" : "Mark as unread"}>
                    <ActionIcon
                      variant="subtle"
                      color="dark"
                      size={36}
                      loading={toggling}
                      aria-label={unread ? "Mark mention as read" : "Mark mention as unread"}
                      onClick={() => void toggleReadState(mention)}
                    >
                      <IconCheck size={17} />
                    </ActionIcon>
                  </Tooltip>
                  <Button
                    variant="default"
                    size="xs"
                    rightSection={<IconArrowUpRight size={15} />}
                    onClick={() => void openMention(mention)}
                  >
                    Open comment
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {feed.hasNextPage && (
        <Group justify="center" className={styles.loadMore}>
          <Button
            variant="default"
            onClick={() => void feed.fetchNextPage()}
            loading={feed.isFetchingNextPage}
          >
            Load older mentions
          </Button>
        </Group>
      )}

      {feed.isFetching && !feed.isFetchingNextPage && feed.data && (
        <div className={styles.backgroundRefresh} aria-live="polite">
          <Loader size="xs" color="rust" /> Refreshing mentions…
        </div>
      )}
    </div>
  );
}
