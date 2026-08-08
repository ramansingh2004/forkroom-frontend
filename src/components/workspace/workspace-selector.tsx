'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Loader,
  TextInput,
} from '@mantine/core';
import {
  IconArrowRight,
  IconBuilding,
  IconPlus,
  IconSearch,
} from '@tabler/icons-react';
import { useWorkspaces } from '@/hooks/use-workspaces';
import styles from './workspace.module.css';

export function WorkspaceSelector() {
  const workspaces = useWorkspaces();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return workspaces.data ?? [];
    return (workspaces.data ?? []).filter((workspace) =>
      `${workspace.name} ${workspace.description ?? ''}`.toLowerCase().includes(normalized),
    );
  }, [query, workspaces.data]);

  if (workspaces.isPending) {
    return (
      <div className={styles.centerState}>
        <Loader color="rust" size="sm" />
        <span>Loading your workspaces…</span>
      </div>
    );
  }

  if (workspaces.isError) {
    return (
      <div className={styles.page}>
        <Alert color="red" title="Could not load workspaces">
          ForkRoom could not load your workspace list. Try again when the API is available.
        </Alert>
        <Button mt="md" variant="light" color="rust" onClick={() => workspaces.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>WORKSPACES</span>
          <h1>Choose where to decide</h1>
          <p>Open a team workspace or create a new one to start a decision.</p>
        </div>
        <Button component={Link} href="/workspaces/new" color="rust" leftSection={<IconPlus size={17} />}>
          Create workspace
        </Button>
      </header>

      {(workspaces.data?.length ?? 0) > 8 && (
        <section className={styles.toolbarPanel} aria-label="Workspace tools">
          <TextInput
            className={styles.search}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search workspaces"
            leftSection={<IconSearch size={16} />}
            aria-label="Search workspaces"
          />
        </section>
      )}

      {workspaces.data?.length === 0 ? (
        <section className={styles.emptyState}>
          <IconBuilding size={28} stroke={1.6} />
          <h2>Your first workspace starts here</h2>
          <p>
            A workspace keeps your team, decisions, proposals, evidence, and locked outcomes together.
          </p>
          <Button component={Link} href="/workspaces/new" color="rust">
            Create your first workspace
          </Button>
        </section>
      ) : (
        <div className={styles.workspaceList}>
          <div className={styles.listHeader} aria-hidden="true">
            <span>Workspace</span>
            <span>Updated</span>
            <span />
          </div>
          {filtered.map((workspace) => (
            <Link key={workspace.id} href={`/w/${workspace.id}`} className={styles.workspaceRow}>
              <div className={styles.workspaceIdentity}>
                <span className={styles.workspaceMark}>{workspace.name.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{workspace.name}</strong>
                  <span>{workspace.description || 'No description yet'}</span>
                </div>
              </div>
              <time dateTime={workspace.updated_at}>
                {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
                  new Date(workspace.updated_at),
                )}
              </time>
              <IconArrowRight size={18} stroke={1.8} aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
