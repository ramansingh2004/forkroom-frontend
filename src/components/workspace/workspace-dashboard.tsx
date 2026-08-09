'use client';

import Link from 'next/link';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Loader,
} from '@mantine/core';
import {
  IconActivity,
  IconArrowRight,
  IconBellCheck,
  IconCalendarEvent,
  IconChecklist,
  IconClock,
  IconLock,
  IconPlus,
  IconUsers,
} from '@tabler/icons-react';

import {
  useWorkspace,
  useWorkspaceDecisions,
  useWorkspaceMembers,
} from '@/hooks/use-workspaces';
import type {
  Decision,
  DecisionStatus,
} from '@/services/workspace.service';

import styles from './workspace.module.css';

const dateFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function decisionCode(decision: Decision) {
  return `D-${decision.id.slice(0, 4).toUpperCase()}`;
}

function statusColor(status: DecisionStatus) {
  switch (status) {
    case 'active':
      return 'rust';
    case 'locked':
      return 'green';
    case 'closed':
      return 'blue';
    case 'archived':
      return 'gray';
    default:
      return 'yellow';
  }
}

function memberInitials(displayName: string) {
  return (
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'FR'
  );
}

export function WorkspaceDashboard({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspace(workspaceId);
  const decisions = useWorkspaceDecisions(workspaceId);
  const members = useWorkspaceMembers(workspaceId);

  if (workspace.isPending) {
    return (
      <div className={styles.centerState}>
        <Loader color="rust" size="sm" />
        <span>Loading workspace overview…</span>
      </div>
    );
  }

  if (workspace.isError) {
    return (
      <div className={styles.page}>
        <Alert color="red" title="Could not load workspace">
          ForkRoom could not load this workspace. Try again when the API is available.
        </Alert>
        <Button
          color="rust"
          variant="light"
          onClick={() => workspace.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const decisionItems = decisions.data ?? [];
  const memberItems = members.data ?? [];
  const activeCount = decisionItems.filter((decision) => decision.status === 'active').length;
  const draftCount = decisionItems.filter((decision) => decision.status === 'draft').length;
  const finalCount = decisionItems.filter(
    (decision) => decision.status === 'closed' || decision.status === 'locked',
  ).length;
  const activeDecisions = decisionItems
    .filter((decision) => decision.status === 'active' || decision.status === 'draft')
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
    );
  const recentDecisions = decisionItems
    .filter((decision) => decision.status === 'locked' || decision.status === 'closed')
    .sort(
      (left, right) =>
        new Date(right.locked_at ?? right.closed_at ?? right.updated_at).getTime() -
        new Date(left.locked_at ?? left.closed_at ?? left.updated_at).getTime(),
    )
    .slice(0, 5);

  return (
    <div className={styles.dashboardPage}>
      <section className={styles.dashboardHero}>
        <div>
          <span className={styles.eyebrow}>WORKSPACE OVERVIEW</span>
          <h1>{workspace.data.name}</h1>
          <p>
            {workspace.data.description ||
              'Shape proposals, resolve objections, and preserve decisions your team can trust.'}
          </p>
        </div>

        <div className={styles.heroActions}>
          <Button
            component={Link}
            href={`/w/${workspaceId}/decisions`}
            variant="default"
          >
            View decisions
          </Button>
          <Button
            component={Link}
            href={`/w/${workspaceId}/decisions/new`}
            color="rust"
            leftSection={<IconPlus size={17} />}
          >
            Create decision
          </Button>
        </div>
      </section>

      <section className={styles.metricStrip} aria-label="Workspace summary">
        <div className={styles.metricItem}>
          <strong>{decisions.isPending || decisions.isError ? '—' : activeCount}</strong>
          <span>ACTIVE DECISIONS</span>
        </div>
        <div className={styles.metricItem}>
          <strong>{decisions.isPending || decisions.isError ? '—' : draftCount}</strong>
          <span>DRAFTS TO FRAME</span>
        </div>
        <div className={styles.metricItem}>
          <strong>{decisions.isPending || decisions.isError ? '—' : finalCount}</strong>
          <span>FINAL DECISIONS</span>
        </div>
        <div className={styles.metricItem}>
          <strong>{members.isPending || members.isError ? '—' : memberItems.length}</strong>
          <span>WORKSPACE MEMBERS</span>
        </div>
      </section>

      <div className={styles.overviewGrid}>
        <div className={styles.overviewPrimary}>
          <section className={styles.dashboardCard}>
            <header className={styles.dashboardSectionHeader}>
              <div className={styles.iconHeading}>
                <IconChecklist size={18} stroke={1.75} aria-hidden="true" />
                <h2>Active decisions</h2>
              </div>
              <Link
                href={`/w/${workspaceId}/decisions`}
                className={styles.viewAllLink}
              >
                VIEW ALL
              </Link>
            </header>

            {decisions.isPending ? (
              <div className={styles.dashboardEmpty}>
                <Loader color="rust" size="xs" />
                <span>Loading decisions…</span>
              </div>
            ) : decisions.isError ? (
              <Alert color="red" mt="md" title="Decisions unavailable">
                This panel could not load. The rest of the workspace is still available.
              </Alert>
            ) : activeDecisions.length === 0 ? (
              <div className={styles.dashboardEmpty}>
                <strong>No active decisions</strong>
                <span>
                  Create the first decision to give proposals, criteria, objections, and voting a shared home.
                </span>
                <Button
                  component={Link}
                  href={`/w/${workspaceId}/decisions/new`}
                  color="rust"
                  variant="light"
                  size="xs"
                  w="fit-content"
                >
                  Create first decision
                </Button>
              </div>
            ) : (
              <div className={styles.activeDecisionList}>
                {activeDecisions.slice(0, 6).map((decision) => (
                  <Link
                    key={decision.id}
                    href={`/w/${workspaceId}/decisions/${decision.id}`}
                    className={styles.activeDecisionRow}
                  >
                    <div className={styles.decisionTitleLine}>
                      <span className={styles.decisionCode}>{decisionCode(decision)}</span>
                      <strong>{decision.title}</strong>
                      <Badge
                        color={statusColor(decision.status)}
                        variant="light"
                        size="sm"
                      >
                        {decision.status}
                      </Badge>
                    </div>
                    <p>{decision.summary || 'No summary has been added yet.'}</p>
                    <div className={styles.decisionMeta}>
                      <span>
                        <IconClock size={12} aria-hidden="true" />
                        Updated {formatDate(decision.updated_at)}
                      </span>
                      {decision.due_at && (
                        <span>
                          <IconCalendarEvent size={12} aria-hidden="true" />
                          Due {formatDate(decision.due_at)}
                        </span>
                      )}
                      <span>
                        Open room
                        <IconArrowRight size={12} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className={styles.dashboardCard}>
            <header className={styles.dashboardSectionHeader}>
              <div className={styles.iconHeading}>
                <IconLock size={18} stroke={1.75} aria-hidden="true" />
                <h2>Recent final decisions</h2>
              </div>
              <Link
                href={`/w/${workspaceId}/decisions`}
                className={styles.viewAllLink}
              >
                VIEW ALL
              </Link>
            </header>

            {decisions.isError ? (
              <div className={styles.dashboardEmptySmall}>
                <strong>Final decisions unavailable</strong>
                <span>This panel will return when the decisions request succeeds.</span>
              </div>
            ) : recentDecisions.length === 0 ? (
              <div className={styles.dashboardEmptySmall}>
                <strong>No final decisions yet</strong>
                <span>Closed and locked decisions will appear here as a durable record.</span>
              </div>
            ) : (
              <div className={styles.recentDecisionList}>
                {recentDecisions.map((decision) => (
                  <Link
                    key={decision.id}
                    href={`/w/${workspaceId}/decisions/${decision.id}`}
                    className={styles.recentDecisionRow}
                  >
                    <span className={styles.recentCode}>{decisionCode(decision)}</span>
                    <strong>{decision.title}</strong>
                    <Badge
                      color={statusColor(decision.status)}
                      variant="light"
                      size="xs"
                    >
                      {decision.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className={styles.overviewRail} aria-label="Workspace supporting information">
          <section className={styles.dashboardCard}>
            <header className={styles.dashboardSectionHeader}>
              <div className={styles.iconHeading}>
                <IconBellCheck size={18} stroke={1.75} aria-hidden="true" />
                <h2>Pending actions</h2>
              </div>
            </header>
            <div className={styles.dashboardEmptySmall}>
              <strong>No action feed connected</strong>
              <span>
                Assigned actions and pending votes will appear when their API endpoints are connected.
              </span>
            </div>
          </section>

          <section className={styles.dashboardCard}>
            <header className={styles.dashboardSectionHeader}>
              <div className={styles.iconHeading}>
                <IconActivity size={18} stroke={1.75} aria-hidden="true" />
                <h2>Recent activity</h2>
              </div>
            </header>
            <div className={styles.dashboardEmptySmall}>
              <strong>No activity feed connected</strong>
              <span>Durable workspace events will appear here when an activity endpoint is available.</span>
            </div>
          </section>

          <section className={styles.dashboardCard}>
            <header className={styles.dashboardSectionHeader}>
              <div className={styles.iconHeading}>
                <IconUsers size={18} stroke={1.75} aria-hidden="true" />
                <h2>Workspace members</h2>
              </div>
            </header>

            {members.isPending ? (
              <div className={styles.dashboardEmptySmall}>
                <Loader color="rust" size="xs" />
                <span>Loading members…</span>
              </div>
            ) : members.isError ? (
              <div className={styles.dashboardEmptySmall}>
                <strong>Members unavailable</strong>
                <span>This panel could not load, but the rest of the workspace is still available.</span>
              </div>
            ) : memberItems.length === 0 ? (
              <div className={styles.dashboardEmptySmall}>
                <strong>No members found</strong>
                <span>Workspace members will appear here after they are added.</span>
              </div>
            ) : (
              <div className={styles.memberList}>
                {memberItems.slice(0, 6).map((member) => (
                  <div key={member.user_id} className={styles.memberRow}>
                    <Avatar
                      src={member.avatar_url}
                      color="rust"
                      radius="xl"
                      size={30}
                    >
                      {memberInitials(member.display_name)}
                    </Avatar>
                    <div>
                      <strong>{member.display_name}</strong>
                      <span>{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
