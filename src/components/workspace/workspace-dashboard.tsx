'use client';

import Link from 'next/link';
import { Alert, Badge, Button, Loader } from '@mantine/core';
import { IconArrowRight, IconPlus } from '@tabler/icons-react';
import { useWorkspace, useWorkspaceDecisions } from '@/hooks/use-workspaces';
import styles from './workspace.module.css';

export function WorkspaceDashboard({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspace(workspaceId);
  const decisions = useWorkspaceDecisions(workspaceId);

  if (workspace.isPending || decisions.isPending) {
    return (
      <div className={styles.centerState}>
        <Loader color="rust" size="sm" />
        <span>Preparing workspace…</span>
      </div>
    );
  }

  if (workspace.isError || decisions.isError) {
    return (
      <div className={styles.page}>
        <Alert color="red" title="Workspace unavailable">
          ForkRoom could not load this workspace or you no longer have access to it.
        </Alert>
      </div>
    );
  }

  const active = decisions.data.filter((decision) =>
    decision.status === 'draft' || decision.status === 'active',
  );
  const locked = decisions.data.filter((decision) => decision.status === 'locked').slice(0, 4);

  return (
    <div className={styles.dashboardPage}>
      <div className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>WORKSPACE OVERVIEW</span>
          <h1>{workspace.data.name}</h1>
          <p>{workspace.data.description || 'Keep the decisions that shape this team in one traceable place.'}</p>
        </div>
        <Button component={Link} href={`/w/${workspaceId}/decisions/new`} color="rust" leftSection={<IconPlus size={17} />}>
          Create decision
        </Button>
      </div>

      {decisions.data.length === 0 ? (
        <section className={styles.emptyState}>
          <h2>Make the first decision visible</h2>
          <p>
            ForkRoom keeps proposals, evidence, objections, votes, and the final locked outcome connected to the reason behind it.
          </p>
          <Button component={Link} href={`/w/${workspaceId}/decisions/new`} color="rust">
            Create first decision
          </Button>
        </section>
      ) : (
        <div className={styles.dashboardGrid}>
          <section className={styles.attentionPanel}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>NOW</span>
                <h2>Attention required</h2>
              </div>
            </div>
            <p className={styles.mutedCopy}>
              Vote, objection, and assigned-action summaries will appear here as those workspace queries are connected.
            </p>
          </section>

          <section className={styles.activePanel}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>{active.length} OPEN</span>
                <h2>Active decisions</h2>
              </div>
              <Link href={`/w/${workspaceId}/decisions`} className={styles.textLink}>View all</Link>
            </div>
            <div className={styles.decisionList}>
              {active.length === 0 ? (
                <p className={styles.mutedCopy}>No draft or active decisions right now.</p>
              ) : active.slice(0, 6).map((decision) => (
                <Link key={decision.id} href={`/w/${workspaceId}/decisions`} className={styles.decisionRow}>
                  <div>
                    <strong>{decision.title}</strong>
                    <span>{decision.summary || 'No summary yet'}</span>
                  </div>
                  <Badge variant="light" color={decision.status === 'active' ? 'rust' : 'gray'}>
                    {decision.status}
                  </Badge>
                  <time dateTime={decision.updated_at}>
                    {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(decision.updated_at))}
                  </time>
                  <IconArrowRight size={17} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.lockedPanel}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>RECENT</span>
                <h2>Locked decisions</h2>
              </div>
            </div>
            {locked.length === 0 ? (
              <p className={styles.mutedCopy}>Locked outcomes will collect here for quick reference.</p>
            ) : (
              <div className={styles.compactList}>
                {locked.map((decision) => <strong key={decision.id}>{decision.title}</strong>)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}