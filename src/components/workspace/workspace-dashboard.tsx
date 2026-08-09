'use client';

import Link from 'next/link';
import { Alert, Avatar, Badge, Button, Loader } from '@mantine/core';
import {
  IconAlertSquareRounded,
  IconArrowUpRight,
  IconArrowRight,
  IconClock,
  IconPlus,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react';
import { useCurrentUser } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import {
  useWorkspace,
  useWorkspaceDecisions,
  useWorkspaceMembers,
} from '@/hooks/use-workspaces';
import {
  formatNotificationTime,
  getNotificationDestination,
  notificationKindMeta,
} from '@/components/notifications/notification-model';
import styles from './workspace.module.css';

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function WorkspaceDashboard({ workspaceId }: { workspaceId: string }) {
  const currentUser = useCurrentUser();
  const workspace = useWorkspace(workspaceId);
  const decisions = useWorkspaceDecisions(workspaceId);
  const members = useWorkspaceMembers(workspaceId);
  const attention = useNotifications({ unreadOnly: true, limit: 50, offset: 0 });

  if (
    currentUser.isPending ||
    workspace.isPending ||
    decisions.isPending ||
    members.isPending
  ) {
    return (
      <div className={styles.centerState}>
        <Loader color="rust" size="sm" />
        <span>Preparing workspace…</span>
      </div>
    );
  }

  if (
    currentUser.isError ||
    workspace.isError ||
    decisions.isError ||
    members.isError ||
    !currentUser.data
  ) {
    return (
      <div className={styles.page}>
        <Alert color="red" title="Workspace unavailable">
          ForkRoom could not load this workspace or you no longer have access to it.
        </Alert>
      </div>
    );
  }

  const openDecisions = decisions.data.filter(
    (decision) => decision.status === 'draft' || decision.status === 'active',
  );
  const finalDecisions = decisions.data.filter(
    (decision) => decision.status === 'closed' || decision.status === 'locked',
  );
  const recentFinal = finalDecisions.slice(0, 5);
  const workspaceAttention =
    attention.data?.items
      .filter((notification) => notification.workspace_id === workspaceId)
      .slice(0, 4) ?? [];
  const currentMember = members.data.find(
    (member) => member.user_id === currentUser.data.id,
  );
  const canManageMembership = ['owner', 'admin'].includes(
    currentMember?.role ?? 'viewer',
  );

  return (
    <div className={styles.dashboardPage}>
      <section className={styles.dashboardHero}>
        <div>
          <span className={styles.eyebrow}>WORKSPACE OVERVIEW</span>
          <h1>{workspace.data.name}</h1>
          <p>
            {workspace.data.description ||
              'A shared workspace for structured discussions, proposals, voting, and permanent decision records.'}
          </p>
        </div>

        <div className={styles.heroActions}>
          <Button
            component={Link}
            href={`/w/${workspaceId}/members`}
            variant="default"
            leftSection={
              canManageMembership ? (
                <IconUserPlus size={17} />
              ) : (
                <IconUsers size={17} />
              )
            }
          >
            {canManageMembership ? 'Add member' : 'View members'}
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
          <strong>{String(openDecisions.length).padStart(2, '0')}</strong>
          <span>OPEN DECISIONS</span>
        </div>
        <div className={styles.metricItem}>
          <strong>
            {attention.data
              ? String(attention.data.unread).padStart(2, '0')
              : '—'}
          </strong>
          <span>MY UNREAD</span>
        </div>
        <div className={styles.metricItem}>
          <strong>{String(finalDecisions.length).padStart(2, '0')}</strong>
          <span>FINAL DECISIONS</span>
        </div>
        <div className={styles.metricItem}>
          <strong>{String(members.data.length).padStart(2, '0')}</strong>
          <span>MEMBERS</span>
        </div>
      </section>

      <div className={styles.overviewGrid}>
        <div className={styles.overviewPrimary}>
          <section className={styles.dashboardCard}>
            <div className={styles.dashboardSectionHeader}>
              <h2>Active decisions</h2>
              <Link href={`/w/${workspaceId}/decisions`} className={styles.viewAllLink}>
                VIEW ALL
              </Link>
            </div>

            {openDecisions.length === 0 ? (
              <div className={styles.dashboardEmpty}>
                <strong>No active decisions</strong>
                <span>Create a decision when the team has a question worth making explicit.</span>
              </div>
            ) : (
              <div className={styles.activeDecisionList}>
                {openDecisions.slice(0, 5).map((decision, index) => (
                  <Link
                    key={decision.id}
                    href={`/w/${workspaceId}/decisions`}
                    className={styles.activeDecisionRow}
                  >
                    <div className={styles.decisionTitleLine}>
                      <span className={styles.decisionCode}>
                        D-{String(index + 1).padStart(2, '0')}
                      </span>
                      <strong>{decision.title}</strong>
                      <Badge
                        variant="light"
                        color={decision.status === 'active' ? 'rust' : 'gray'}
                        size="sm"
                      >
                        {decision.status}
                      </Badge>
                    </div>
                    <p>{decision.summary || 'No summary has been added yet.'}</p>
                    <div className={styles.decisionMeta}>
                      <span><IconClock size={14} /> Updated {formatUpdatedAt(decision.updated_at)}</span>
                      <span>Open decision</span>
                      <IconArrowRight size={16} aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className={styles.dashboardCard}>
            <div className={styles.dashboardSectionHeader}>
              <h2>Recent decisions</h2>
            </div>

            {recentFinal.length === 0 ? (
              <div className={styles.dashboardEmpty}>
                <strong>No final decisions yet</strong>
                <span>Closed and locked outcomes will collect here for quick reference.</span>
              </div>
            ) : (
              <div className={styles.recentDecisionList}>
                {recentFinal.map((decision, index) => (
                  <div key={decision.id} className={styles.recentDecisionRow}>
                    <span className={styles.recentCode}>DEC-{String(index + 1).padStart(2, '0')}</span>
                    <strong>{decision.title}</strong>
                    <Badge variant="light" color={decision.status === 'locked' ? 'green' : 'gray'}>
                      {decision.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className={styles.overviewRail}>
          <section className={styles.dashboardCard}>
            <div className={styles.dashboardSectionHeader}>
              <h2 className={styles.iconHeading}>
                <IconAlertSquareRounded size={19} color="var(--fr-primary)" />
                Attention required
              </h2>
              <Link href="/notifications" className={styles.viewAllLink}>
                VIEW ALL
              </Link>
            </div>

            {attention.isPending ? (
              <div className={styles.dashboardLoadingSmall}>
                <Loader color="rust" size="xs" />
                Loading your attention queue…
              </div>
            ) : attention.isError ? (
              <div className={styles.dashboardEmptySmall}>
                <strong>Attention queue unavailable</strong>
                <span>
                  The rest of this workspace is available, but notifications
                  could not be refreshed.
                </span>
              </div>
            ) : workspaceAttention.length === 0 ? (
              <div className={styles.dashboardEmptySmall}>
                <strong>No unread items in this workspace</strong>
                <span>
                  New deadlines, reviews, actions, and voting reminders will
                  appear here.
                </span>
              </div>
            ) : (
              <div className={styles.attentionList}>
                {workspaceAttention.map((notification) => {
                  const meta = notificationKindMeta[notification.kind];
                  const Icon = meta.icon;

                  return (
                    <Link
                      key={notification.id}
                      href={getNotificationDestination(notification)}
                      className={styles.attentionRow}
                    >
                      <span className={styles.attentionIcon}>
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{notification.title}</strong>
                        <small>
                          {meta.label} ·{' '}
                          {formatNotificationTime(notification.created_at)}
                        </small>
                      </span>
                      <IconArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.dashboardCard}>
            <div className={styles.dashboardSectionHeader}>
              <h2>Live activity</h2>
            </div>
            <div className={styles.dashboardEmptySmall}>
              <strong>Activity stream coming next</strong>
              <span>This panel is reserved for real workspace events, not demo activity.</span>
            </div>
          </section>

          <section className={styles.dashboardCard}>
            <div className={styles.dashboardSectionHeader}>
              <h2 className={styles.iconHeading}>
                <IconUsers size={19} />
                Workspace members
              </h2>
              <Link
                href={`/w/${workspaceId}/members`}
                className={styles.viewAllLink}
              >
                VIEW ALL
              </Link>
            </div>
            <div className={styles.memberList}>
              {members.data.slice(0, 5).map((member) => (
                <div key={member.user_id} className={styles.memberRow}>
                  <Avatar src={member.avatar_url} color="rust" size={30} radius="xl">
                    {member.display_name.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <div>
                    <strong>{member.display_name}</strong>
                    <span>{member.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
