'use client';

import Link from 'next/link';
import { Alert, Badge, Button, Loader } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useWorkspace, useWorkspaceDecisions } from '@/hooks/use-workspaces';
import styles from './workspace.module.css';

export function DecisionsIndex({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspace(workspaceId);
  const decisions = useWorkspaceDecisions(workspaceId);

  if (workspace.isPending || decisions.isPending) {
    return <div className={styles.centerState}><Loader color="rust" size="sm" /></div>;
  }

  if (workspace.isError || decisions.isError) {
    return <div className={styles.page}><Alert color="red">Could not load decisions.</Alert></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>DECISIONS</span>
          <h1>{workspace.data.name}</h1>
          <p>Find the decisions your team is shaping, voting on, or preserving.</p>
        </div>
        <Button component={Link} href={`/w/${workspaceId}/decisions/new`} color="rust" leftSection={<IconPlus size={17} />}>
          Create decision
        </Button>
      </header>

      {decisions.data.length === 0 ? (
        <section className={styles.emptyState}>
          <h2>No decisions yet</h2>
          <p>Start with one question that deserves explicit alternatives, reasoning, and a traceable outcome.</p>
          <Button component={Link} href={`/w/${workspaceId}/decisions/new`} color="rust">Create decision</Button>
        </section>
      ) : (
        <div className={styles.decisionTable}>
          <div className={styles.decisionTableHeader}>
            <span>Decision</span><span>Status</span><span>Updated</span>
          </div>
          {decisions.data.map((decision) => (
            <Link
              key={decision.id}
              href={`/w/${workspaceId}/decisions/${decision.id}`}
              className={styles.decisionTableRow}
            >
              <div>
                <strong>{decision.title}</strong>
                <span>{decision.summary || 'No summary yet'}</span>
              </div>
              <Badge variant="light" color={decision.status === 'active' ? 'rust' : decision.status === 'locked' ? 'green' : 'gray'}>
                {decision.status}
              </Badge>
              <time dateTime={decision.updated_at}>
                {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(decision.updated_at))}
              </time>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
