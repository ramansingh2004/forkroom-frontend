"use client";

import Link from "next/link";
import { Badge, Button, Tooltip } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useWorkspace, useWorkspaceDecisions } from "@/hooks/use-workspaces";
import {
  PageSkeleton,
  RecoveryState,
} from "@/components/feedback/app-feedback";
import { getApiStatus } from "@/services/auth.service";
import styles from "./workspace.module.css";

export function DecisionsIndex({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspace(workspaceId);
  const decisions = useWorkspaceDecisions(workspaceId);

  if (workspace.isPending || decisions.isPending) {
    return <PageSkeleton label="Loading workspace decisions" />;
  }

  if (workspace.isError || decisions.isError) {
    const error = workspace.error ?? decisions.error;
    return (
      <div className={styles.page}>
        <RecoveryState
          error={error}
          title={
            getApiStatus(error) === 403
              ? "Decision access is read-only"
              : "Decisions are unavailable"
          }
          fallback="ForkRoom could not load this workspace's decisions."
          onRetry={() => {
            void workspace.refetch();
            void decisions.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>DECISIONS</span>
          <h1>{workspace.data.name}</h1>
          <p>
            Find the decisions your team is shaping, voting on, or preserving.
          </p>
        </div>
        <Tooltip label="Create a decision in this workspace">
          <Button
            component={Link}
            href={`/w/${workspaceId}/decisions/new`}
            color="rust"
            leftSection={<IconPlus size={17} />}
          >
            Create decision
          </Button>
        </Tooltip>
      </header>

      {decisions.data.length === 0 ? (
        <section className={styles.emptyState}>
          <h2>No decisions yet</h2>
          <p>
            Start with one question that deserves explicit alternatives,
            reasoning, and a traceable outcome.
          </p>
          <Button
            component={Link}
            href={`/w/${workspaceId}/decisions/new`}
            color="rust"
          >
            Create decision
          </Button>
        </section>
      ) : (
        <div className={styles.decisionTable}>
          <div className={styles.decisionTableHeader}>
            <span>Decision</span>
            <span>Status</span>
            <span>Updated</span>
          </div>
          {decisions.data.map((decision) => (
            <Link
              key={decision.id}
              href={`/w/${workspaceId}/decisions/${decision.id}`}
              className={styles.decisionTableRow}
            >
              <div>
                <strong>{decision.title}</strong>
                <span>{decision.summary || "No summary yet"}</span>
              </div>
              <Badge
                variant="light"
                color={
                  decision.status === "active"
                    ? "rust"
                    : decision.status === "locked"
                      ? "green"
                      : "gray"
                }
              >
                {decision.status}
              </Badge>
              <time dateTime={decision.updated_at}>
                {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                  new Date(decision.updated_at),
                )}
              </time>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
