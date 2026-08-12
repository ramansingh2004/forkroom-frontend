"use client";

import Link from "next/link";
import { Alert, Avatar, Badge, Button, Skeleton, Tooltip } from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCalendarDue,
  IconCheckbox,
  IconClock,
  IconFileX,
  IconLock,
  IconMessageExclamation,
  IconPlus,
  IconRefresh,
  IconScale,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";

import {
  formatNotificationTime,
  getNotificationDestination,
  notificationKindMeta,
} from "@/components/notifications/notification-model";
import { useCurrentUser } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useWorkspaceDashboardData } from "@/hooks/use-workspace-dashboard";
import {
  useWorkspace,
  useWorkspaceDecisions,
  useWorkspaceMembers,
} from "@/hooks/use-workspaces";
import type {
  Decision,
  DecisionAction,
  DecisionReview,
  WorkspaceMember,
} from "@/services/workspace.service";
import {
  PageSkeleton,
  RecoveryState,
} from "@/components/feedback/app-feedback";

import styles from "./workspace.module.css";

const DAY_IN_MS = 86_400_000;

type AttentionItem = {
  id: string;
  label: string;
  title: string;
  detail: string;
  href: string;
  tone: "rust" | "warning" | "danger" | "neutral";
  icon: typeof IconClock;
};

type ActionWithDecision = { action: DecisionAction; decision: Decision };
type ReviewWithDecision = { review: DecisionReview; decision: Decision };

function formatDate(value: string | null) {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year:
      new Date(value).getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
  }).format(new Date(value));
}

function formatRelativeTime(value: string) {
  const difference = new Date(value).getTime() - Date.now();
  const absoluteDifference = Math.abs(difference);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absoluteDifference < 60_000) return "just now";
  if (absoluteDifference < 3_600_000) {
    return formatter.format(Math.round(difference / 60_000), "minute");
  }
  if (absoluteDifference < DAY_IN_MS) {
    return formatter.format(Math.round(difference / 3_600_000), "hour");
  }
  if (absoluteDifference < DAY_IN_MS * 14) {
    return formatter.format(Math.round(difference / DAY_IN_MS), "day");
  }
  return formatDate(value);
}

function deadlineTone(value: string | null) {
  if (!value) return "neutral";
  const difference = new Date(value).getTime() - Date.now();
  if (difference < 0) return "danger";
  if (difference <= DAY_IN_MS * 7) return "warning";
  return "neutral";
}

function latestTimestamp(values: Array<string | null | undefined>) {
  return values.reduce<string>((latest, value) => {
    if (!value) return latest;
    return new Date(value).getTime() > new Date(latest).getTime()
      ? value
      : latest;
  }, "1970-01-01T00:00:00.000Z");
}

function memberName(member: WorkspaceMember | undefined) {
  return member?.display_name ?? "Former member";
}

function DashboardLoading() {
  return (
    <div
      className={styles.dashboardSkeleton}
      aria-label="Loading dashboard details"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} height={54} radius={0} />
      ))}
    </div>
  );
}

export function WorkspaceDashboard({ workspaceId }: { workspaceId: string }) {
  const currentUser = useCurrentUser();
  const workspace = useWorkspace(workspaceId);
  const decisions = useWorkspaceDecisions(workspaceId);
  const members = useWorkspaceMembers(workspaceId);
  const notifications = useNotifications({ limit: 100, offset: 0 });
  const dashboard = useWorkspaceDashboardData(
    workspaceId,
    decisions.data ?? [],
  );

  if (
    currentUser.isPending ||
    workspace.isPending ||
    decisions.isPending ||
    members.isPending
  ) {
    return <PageSkeleton label="Preparing workspace dashboard" />;
  }

  if (
    currentUser.isError ||
    workspace.isError ||
    decisions.isError ||
    members.isError ||
    !currentUser.data
  ) {
    const error =
      currentUser.error ?? workspace.error ?? decisions.error ?? members.error;
    return (
      <div className={styles.page}>
        <RecoveryState
          error={error}
          title="Workspace unavailable"
          fallback="ForkRoom could not load this workspace or your access changed."
          onRetry={() => {
            void currentUser.refetch();
            void workspace.refetch();
            void decisions.refetch();
            void members.refetch();
          }}
        />
      </div>
    );
  }

  const now = Date.now();
  const memberById = new Map(
    members.data.map((member) => [member.user_id, member]),
  );
  const currentMember = memberById.get(currentUser.data.id);
  const currentRole = currentMember?.role ?? "viewer";
  const canCreateDecision = ["owner", "admin", "member"].includes(currentRole);
  const canManageWorkspace = ["owner", "admin"].includes(currentRole);
  const canVote = currentRole !== "viewer";
  const decisionPath = (decisionId: string) =>
    `/w/${workspaceId}/decisions/${decisionId}`;
  const snapshotByDecision = new Map(
    dashboard.decisionDetails.map((snapshot) => [
      snapshot.decision.id,
      snapshot,
    ]),
  );
  const attachmentsByDecision = new Map<string, typeof dashboard.attachments>();

  dashboard.attachments.forEach((attachment) => {
    if (!attachment.decision_id) return;
    const current = attachmentsByDecision.get(attachment.decision_id) ?? [];
    current.push(attachment);
    attachmentsByDecision.set(attachment.decision_id, current);
  });

  const activeDecisions = decisions.data
    .filter(
      (decision) => decision.status === "draft" || decision.status === "active",
    )
    .sort((left, right) => {
      const leftDeadline = left.due_at
        ? new Date(left.due_at).getTime()
        : Number.POSITIVE_INFINITY;
      const rightDeadline = right.due_at
        ? new Date(right.due_at).getTime()
        : Number.POSITIVE_INFINITY;
      if (leftDeadline !== rightDeadline) return leftDeadline - rightDeadline;
      return (
        new Date(right.updated_at).getTime() -
        new Date(left.updated_at).getTime()
      );
    });
  const resumeDecision = [...activeDecisions].sort(
    (left, right) =>
      new Date(right.updated_at).getTime() -
      new Date(left.updated_at).getTime(),
  )[0];
  const lockedDecisions = decisions.data
    .filter((decision) => decision.status === "locked")
    .sort(
      (left, right) =>
        new Date(right.locked_at ?? right.updated_at).getTime() -
        new Date(left.locked_at ?? left.updated_at).getTime(),
    );
  const eligibleParticipants = members.data.filter(
    (member) => member.role !== "viewer",
  );

  const myActions: ActionWithDecision[] = dashboard.decisionDetails
    .flatMap(({ decision, actions }) =>
      actions.map((action) => ({ action, decision })),
    )
    .filter(
      ({ action }) =>
        action.assignee_id === currentUser.data.id &&
        action.status !== "completed" &&
        action.status !== "cancelled",
    )
    .sort((left, right) => {
      const leftDue = left.action.due_at
        ? new Date(left.action.due_at).getTime()
        : Number.POSITIVE_INFINITY;
      const rightDue = right.action.due_at
        ? new Date(right.action.due_at).getTime()
        : Number.POSITIVE_INFINITY;
      return leftDue - rightDue;
    });
  const overdueActions = myActions.filter(
    ({ action }) => action.due_at && new Date(action.due_at).getTime() < now,
  );
  const reviewsDue: ReviewWithDecision[] = canManageWorkspace
    ? dashboard.decisionDetails
        .flatMap(({ decision, reviews }) =>
          reviews.map((review) => ({ review, decision })),
        )
        .filter(
          ({ review }) =>
            review.status === "scheduled" &&
            new Date(review.scheduled_for).getTime() <= now,
        )
        .sort(
          (left, right) =>
            new Date(left.review.scheduled_for).getTime() -
            new Date(right.review.scheduled_for).getTime(),
        )
    : [];
  const openVotes = canVote
    ? dashboard.decisionDetails.flatMap(({ decision, votingSessions }) =>
        votingSessions
          .filter((session) => session.status === "open")
          .map((session) => ({ session, decision })),
      )
    : [];
  const blockingDecisions = dashboard.decisionDetails.filter(
    ({ decision, blockingObjections }) =>
      ["draft", "active"].includes(decision.status) &&
      blockingObjections.length > 0,
  );
  const failedAttachments = dashboard.attachments.filter(
    (attachment) => attachment.status === "rejected",
  );
  const failedExports = dashboard.decisionDetails.filter(
    ({ decisionExport }) => decisionExport?.status === "failed",
  );
  const approachingDeadlines = activeDecisions.filter((decision) => {
    if (!decision.due_at) return false;
    const difference = new Date(decision.due_at).getTime() - now;
    return difference >= 0 && difference <= DAY_IN_MS * 7;
  });

  const attentionItems: AttentionItem[] = [
    ...openVotes.map(({ decision, session }) => ({
      id: `vote-${session.id}`,
      label: "VOTE WAITING",
      title: decision.title,
      detail: session.closes_at
        ? `Voting closes ${formatRelativeTime(session.closes_at)}.`
        : "Voting is open with no scheduled close time.",
      href: decisionPath(decision.id),
      tone: "rust" as const,
      icon: IconScale,
    })),
    ...blockingDecisions.map(({ decision, blockingObjections }) => ({
      id: `objection-${decision.id}`,
      label: "BLOCKING OBJECTION",
      title: decision.title,
      detail: `${blockingObjections.length} open blocking objection${blockingObjections.length === 1 ? "" : "s"} need resolution.`,
      href: decisionPath(decision.id),
      tone: "warning" as const,
      icon: IconMessageExclamation,
    })),
    ...failedAttachments.map((attachment) => ({
      id: `attachment-${attachment.id}`,
      label: "FAILED UPLOAD",
      title: attachment.filename,
      detail:
        attachment.processing_error ??
        "The evidence file could not be processed. Open the decision to retry.",
      href: attachment.decision_id
        ? decisionPath(attachment.decision_id)
        : `/w/${workspaceId}`,
      tone: "danger" as const,
      icon: IconFileX,
    })),
    ...failedExports.map(({ decision, decisionExport }) => ({
      id: `export-${decisionExport!.id}`,
      label: "FAILED EXPORT",
      title: decision.title,
      detail:
        decisionExport!.error ??
        "The locked record is safe, but PDF generation needs to be retried.",
      href: decisionPath(decision.id),
      tone: "danger" as const,
      icon: IconFileX,
    })),
    ...overdueActions.map(({ action, decision }) => ({
      id: `action-${action.id}`,
      label: "OVERDUE ACTION",
      title: action.title,
      detail: `${decision.title} · Due ${formatDate(action.due_at)}`,
      href: decisionPath(decision.id),
      tone: "danger" as const,
      icon: IconCheckbox,
    })),
    ...reviewsDue.map(({ review, decision }) => ({
      id: `review-${review.id}`,
      label: "REVIEW DUE",
      title: decision.title,
      detail: `Scheduled ${formatRelativeTime(review.scheduled_for)}. Record an outcome or reschedule.`,
      href: decisionPath(decision.id),
      tone: "warning" as const,
      icon: IconCalendarDue,
    })),
    ...approachingDeadlines.map((decision) => ({
      id: `deadline-${decision.id}`,
      label: "DEADLINE NEAR",
      title: decision.title,
      detail: `Decision deadline ${formatRelativeTime(decision.due_at!)}.`,
      href: decisionPath(decision.id),
      tone: "warning" as const,
      icon: IconClock,
    })),
  ];

  const workspaceActivity =
    notifications.data?.items
      .filter((notification) => notification.workspace_id === workspaceId)
      .slice(0, 7) ?? [];
  const activityDestination = (sourceId: string, fallback: string) => {
    const matched = dashboard.decisionDetails.find(
      ({ actions, reviews, votingSessions }) =>
        actions.some((action) => action.id === sourceId) ||
        reviews.some((review) => review.id === sourceId) ||
        votingSessions.some((session) => session.id === sourceId),
    );
    return matched ? decisionPath(matched.decision.id) : fallback;
  };

  if (decisions.data.length === 0) {
    return (
      <div className={styles.dashboardPage}>
        <header className={styles.workspaceHeader}>
          <div>
            <span className={styles.eyebrow}>WORKSPACE</span>
            <h1>{workspace.data.name}</h1>
            <p>
              {workspace.data.description ||
                "A shared place for durable decisions."}
            </p>
          </div>
        </header>
        <section className={styles.firstDecisionState}>
          <span className={styles.sectionIndex}>START HERE</span>
          <h2>Frame the first decision</h2>
          <p>
            Create a draft, gather proposals and evidence, resolve objections,
            vote, and lock one durable outcome.
          </p>
          <div className={styles.emptyActions}>
            {canCreateDecision && (
              <Button
                component={Link}
                href={`/w/${workspaceId}/decisions/new`}
                color="rust"
                leftSection={<IconPlus size={17} />}
              >
                Create first decision
              </Button>
            )}
            <Button
              component={Link}
              href={`/w/${workspaceId}/members`}
              variant="default"
              leftSection={<IconUsers size={17} />}
            >
              {canManageWorkspace ? "Invite teammates" : "View members"}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.dashboardPage}>
      <header className={styles.workspaceHeader}>
        <div className={styles.workspaceHeading}>
          <span className={styles.eyebrow}>WORKSPACE</span>
          <h1>{workspace.data.name}</h1>
          <p>
            {workspace.data.description ||
              "Resume active work, clear blockers, and keep decisions moving."}
          </p>
        </div>
        {resumeDecision && (
          <Link
            href={decisionPath(resumeDecision.id)}
            className={styles.continueWorking}
          >
            <span>CONTINUE WORKING</span>
            <strong>{resumeDecision.title}</strong>
            <small>
              Updated {formatRelativeTime(resumeDecision.updated_at)}
            </small>
            <IconArrowRight size={17} aria-hidden="true" />
          </Link>
        )}
        <div className={styles.workspaceHeaderActions}>
          {canManageWorkspace && (
            <Button
              component={Link}
              href={`/w/${workspaceId}/settings`}
              variant="default"
              leftSection={<IconSettings size={16} />}
            >
              Settings
            </Button>
          )}
          {canCreateDecision && (
            <Button
              component={Link}
              href={`/w/${workspaceId}/decisions/new`}
              color="rust"
              leftSection={<IconPlus size={17} />}
            >
              Create decision
            </Button>
          )}
          {!canCreateDecision && (
            <Tooltip label="Viewers can follow decisions but cannot create them.">
              <span>
                <Button leftSection={<IconPlus size={17} />} disabled>
                  Create decision
                </Button>
              </span>
            </Tooltip>
          )}
        </div>
      </header>

      <section
        className={`${styles.dashboardPanel} ${styles.attentionPanelNew}`}
      >
        <div className={styles.dashboardPanelHeader}>
          <div>
            <span className={styles.sectionIndex}>01 / ATTENTION REQUIRED</span>
            <h2>What needs your action</h2>
          </div>
          <div className={styles.panelHeaderActions}>
            {(dashboard.isError || dashboard.hasPartialFailure) && (
              <span className={styles.partialLabel}>PARTIAL DATA</span>
            )}
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={<IconRefresh size={14} />}
              loading={dashboard.isFetching && !dashboard.isPending}
              onClick={() => dashboard.refetch()}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className={styles.attentionSummary} aria-label="Attention summary">
          <div>
            <strong>{openVotes.length}</strong>
            <span>Votes waiting for me</span>
          </div>
          <div>
            <strong>
              {blockingDecisions.reduce(
                (total, item) => total + item.blockingObjections.length,
                0,
              )}
            </strong>
            <span>Blocking objections</span>
          </div>
          <div>
            <strong>{failedAttachments.length + failedExports.length}</strong>
            <span>Failed uploads / exports</span>
          </div>
          <div>
            <strong>{overdueActions.length}</strong>
            <span>Overdue actions</span>
          </div>
          <div>
            <strong>{reviewsDue.length}</strong>
            <span>Reviews due</span>
          </div>
          <div>
            <strong>{approachingDeadlines.length}</strong>
            <span>Deadlines within 7 days</span>
          </div>
        </div>

        {dashboard.isPending ? (
          <DashboardLoading />
        ) : attentionItems.length === 0 ? (
          <div className={styles.attentionClear}>
            <span className={styles.clearMark}>✓</span>
            <div>
              <strong>Your queue is clear</strong>
              <p>
                No open votes, blockers, failures, overdue work, or due reviews
                need attention.
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.attentionQueue}>
            {attentionItems.slice(0, 9).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={styles.attentionQueueRow}
                  data-tone={item.tone}
                >
                  <span className={styles.queueIcon}>
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className={styles.queueCopy}>
                    <small>{item.label}</small>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </span>
                  <span className={styles.queueAction}>OPEN</span>
                  <IconArrowRight size={16} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section
        className={`${styles.dashboardPanel} ${styles.activeDecisionsPanel}`}
      >
        <div className={styles.dashboardPanelHeader}>
          <div>
            <span className={styles.sectionIndex}>02 / ACTIVE DECISIONS</span>
            <h2>Decisions in motion</h2>
          </div>
          <Link
            href={`/w/${workspaceId}/decisions`}
            className={styles.viewAllLinkNew}
          >
            VIEW ALL
          </Link>
        </div>

        <div className={styles.activeDecisionTable}>
          <div className={styles.activeDecisionHeader} aria-hidden="true">
            <span>Title</span>
            <span>Status</span>
            <span>Owner</span>
            <span>Participants</span>
            <span>Deadline</span>
            <span>Last activity</span>
            <span>Unresolved signals</span>
            <span />
          </div>

          {activeDecisions.length === 0 ? (
            <div className={styles.dashboardRowEmpty}>
              <strong>No active decisions</strong>
              <span>
                Draft or activate a decision to bring it into this working list.
              </span>
            </div>
          ) : (
            activeDecisions.slice(0, 8).map((decision) => {
              const snapshot = snapshotByDecision.get(decision.id);
              const decisionAttachments =
                attachmentsByDecision.get(decision.id) ?? [];
              const overdueDecisionActions =
                snapshot?.actions.filter(
                  (action) =>
                    action.status !== "completed" &&
                    action.status !== "cancelled" &&
                    action.due_at &&
                    new Date(action.due_at).getTime() < now,
                ).length ?? 0;
              const failedEvidence = decisionAttachments.filter(
                (attachment) => attachment.status === "rejected",
              ).length;
              const pendingEvidence = decisionAttachments.filter(
                (attachment) =>
                  attachment.status === "pending" ||
                  attachment.status === "processing",
              ).length;
              const blockerCount = snapshot?.blockingObjections.length ?? 0;
              const owner = memberById.get(decision.created_by_id);
              const lastActivity = latestTimestamp([
                decision.updated_at,
                ...(snapshot?.actions ?? []).map((action) => action.updated_at),
                ...(snapshot?.reviews ?? []).map((review) => review.updated_at),
                ...(snapshot?.proposals ?? []).map(
                  (proposal) => proposal.updated_at,
                ),
                ...decisionAttachments.map(
                  (attachment) => attachment.updated_at,
                ),
              ]);

              return (
                <Link
                  key={decision.id}
                  href={decisionPath(decision.id)}
                  className={styles.activeDecisionTableRow}
                >
                  <span className={styles.tableDecisionTitle}>
                    <strong>{decision.title}</strong>
                    <small>{decision.summary || "No summary added yet."}</small>
                  </span>
                  <span>
                    <Badge
                      variant="light"
                      color={decision.status === "active" ? "rust" : "gray"}
                      size="sm"
                    >
                      {decision.status}
                    </Badge>
                  </span>
                  <span className={styles.ownerCell}>
                    <Avatar
                      src={owner?.avatar_url}
                      size={25}
                      radius="xl"
                      color="rust"
                    >
                      {memberName(owner).slice(0, 2).toUpperCase()}
                    </Avatar>
                    <span>{memberName(owner)}</span>
                  </span>
                  <span
                    className={styles.participantCell}
                    title={`${eligibleParticipants.length} workspace contributors can participate`}
                  >
                    <span className={styles.avatarStack} aria-hidden="true">
                      {eligibleParticipants.slice(0, 3).map((member) => (
                        <Avatar
                          key={member.user_id}
                          src={member.avatar_url}
                          size={23}
                          radius="xl"
                          color="gray"
                        >
                          {member.display_name.slice(0, 1).toUpperCase()}
                        </Avatar>
                      ))}
                    </span>
                    <small>{eligibleParticipants.length}</small>
                  </span>
                  <span
                    className={styles.deadlineCell}
                    data-tone={deadlineTone(decision.due_at)}
                  >
                    {formatDate(decision.due_at)}
                  </span>
                  <span className={styles.lastActivityCell}>
                    {formatRelativeTime(lastActivity)}
                  </span>
                  <span className={styles.signalCell}>
                    {dashboard.isPending ? (
                      "Checking…"
                    ) : blockerCount +
                        overdueDecisionActions +
                        failedEvidence +
                        pendingEvidence ===
                      0 ? (
                      <span className={styles.clearSignal}>Clear</span>
                    ) : (
                      <>
                        {blockerCount > 0 && (
                          <small>
                            {blockerCount} blocker
                            {blockerCount === 1 ? "" : "s"}
                          </small>
                        )}
                        {overdueDecisionActions > 0 && (
                          <small>{overdueDecisionActions} overdue</small>
                        )}
                        {failedEvidence > 0 && (
                          <small>
                            {failedEvidence} failed file
                            {failedEvidence === 1 ? "" : "s"}
                          </small>
                        )}
                        {pendingEvidence > 0 && (
                          <small>{pendingEvidence} processing</small>
                        )}
                      </>
                    )}
                  </span>
                  <IconArrowRight size={16} aria-hidden="true" />
                </Link>
              );
            })
          )}
        </div>
      </section>

      <div className={styles.dashboardLowerGrid}>
        <details className={styles.dashboardPanel} open>
          <summary className={styles.dashboardPanelHeader}>
            <div>
              <span className={styles.sectionIndex}>03 / MY ACTIONS</span>
              <h2>Assigned follow-through</h2>
            </div>
            <span className={styles.sectionCount}>{myActions.length}</span>
          </summary>

          {dashboard.isPending ? (
            <DashboardLoading />
          ) : myActions.length === 0 ? (
            <div className={styles.dashboardRowEmpty}>
              <strong>No open actions assigned to you</strong>
              <span>
                New implementation work will appear here after a decision is
                locked.
              </span>
            </div>
          ) : (
            <div className={styles.compactDashboardList}>
              {myActions.slice(0, 7).map(({ action, decision }) => {
                const overdue =
                  Boolean(action.due_at) &&
                  new Date(action.due_at!).getTime() < now;
                return (
                  <Link
                    key={action.id}
                    href={decisionPath(decision.id)}
                    className={styles.compactDashboardRow}
                  >
                    <span
                      className={styles.rowStatusMark}
                      data-status={action.status}
                    />
                    <span>
                      <strong>{action.title}</strong>
                      <small>{decision.title}</small>
                    </span>
                    <span
                      className={styles.rowDate}
                      data-overdue={overdue || undefined}
                    >
                      {action.due_at
                        ? formatDate(action.due_at)
                        : "No due date"}
                    </span>
                    <IconArrowRight size={15} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}
        </details>

        <section className={styles.dashboardPanel}>
          <div className={styles.dashboardPanelHeader}>
            <div>
              <span className={styles.sectionIndex}>04 / LOCKED RECORDS</span>
              <h2>Recently locked decisions</h2>
            </div>
            <IconLock size={17} aria-hidden="true" />
          </div>

          {lockedDecisions.length === 0 ? (
            <div className={styles.dashboardRowEmpty}>
              <strong>No locked decisions yet</strong>
              <span>
                Committed outcomes will remain available here for quick
                reference.
              </span>
            </div>
          ) : (
            <div className={styles.compactDashboardList}>
              {lockedDecisions.slice(0, 6).map((decision) => (
                <Link
                  key={decision.id}
                  href={decisionPath(decision.id)}
                  className={styles.lockedDecisionRow}
                >
                  <span className={styles.lockedMark}>
                    <IconLock size={13} />
                  </span>
                  <span>
                    <strong>{decision.title}</strong>
                    <small>
                      Locked{" "}
                      {formatRelativeTime(
                        decision.locked_at ?? decision.updated_at,
                      )}{" "}
                      · {memberName(memberById.get(decision.created_by_id))}
                    </small>
                  </span>
                  <IconArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className={styles.dashboardPanel}>
        <div className={styles.dashboardPanelHeader}>
          <div>
            <span className={styles.sectionIndex}>05 / RECENT ACTIVITY</span>
            <h2>What changed around your work</h2>
          </div>
          <Link href="/notifications" className={styles.viewAllLinkNew}>
            VIEW NOTIFICATIONS
          </Link>
        </div>

        {notifications.isPending ? (
          <DashboardLoading />
        ) : notifications.isError ? (
          <div className={styles.dashboardRowEmpty}>
            <strong>Recent activity is unavailable</strong>
            <span>
              The workspace is still usable. Refresh notifications to try again.
            </span>
            <Button
              size="compact-sm"
              variant="default"
              onClick={() => void notifications.refetch()}
            >
              Retry activity
            </Button>
          </div>
        ) : workspaceActivity.length === 0 ? (
          <div className={styles.dashboardRowEmpty}>
            <strong>No recent activity</strong>
            <span>
              Decision deadlines, votes, actions, and reviews will appear here.
            </span>
          </div>
        ) : (
          <div className={styles.activityList}>
            {workspaceActivity.map((notification) => {
              const meta = notificationKindMeta[notification.kind];
              const Icon = meta.icon;
              const fallback = getNotificationDestination(notification);

              return (
                <Link
                  key={notification.id}
                  href={activityDestination(notification.source_id, fallback)}
                  className={styles.activityRow}
                >
                  <span className={styles.activityIcon}>
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{notification.title}</strong>
                    <small>{notification.body}</small>
                  </span>
                  <span className={styles.activityKind}>{meta.label}</span>
                  <time>{formatNotificationTime(notification.created_at)}</time>
                  {!notification.read_at && (
                    <span className={styles.unreadDot} title="Unread" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {(dashboard.isError || dashboard.hasPartialFailure) && (
        <div className={styles.dashboardDataNotice}>
          <IconAlertTriangle size={16} />
          Some decision details could not be refreshed. Visible data remains
          usable; retry from Attention required.
        </div>
      )}
    </div>
  );
}
