"use client";

import { Alert, Badge, Button, Group, Loader, Tabs } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconLock,
  IconRefresh,
} from "@tabler/icons-react";

import { useDecisionLockVerification } from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import type {
  DecisionLock,
  Proposal,
  WorkspaceMember,
} from "@/services/workspace.service";

import styles from "./decision-room.module.css";
import { DecisionActionsPanel } from "./decision-actions-panel";
import { DecisionExportPanel } from "./decision-export-panel";
import { DecisionHistoryPanel } from "./decision-history-panel";
import { DecisionReviewsPanel } from "./decision-reviews-panel";
import { LockedEvidencePanel } from "./locked-evidence-panel";

type LockedDecisionPanelProps = {
  workspaceId: string;
  decisionId: string;
  title: string;
  summary: string | null;
  decisionLock: DecisionLock;
  proposals: Proposal[];
  members: WorkspaceMember[];
  currentUserId: string;
  canRequestExport: boolean;
  canCreateActions: boolean;
  canManageFollowThrough: boolean;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));

export function LockedDecisionPanel({
  workspaceId,
  decisionId,
  title,
  summary,
  decisionLock,
  proposals,
  members,
  currentUserId,
  canRequestExport,
  canCreateActions,
  canManageFollowThrough,
}: LockedDecisionPanelProps) {
  const verification = useDecisionLockVerification(workspaceId, decisionId);
  const winner = proposals.find(
    (proposal) => proposal.id === decisionLock.winning_proposal_id,
  );
  const lockedBy = members.find(
    (member) => member.user_id === decisionLock.locked_by_id,
  );

  return (
    <article className={`${styles.document} ${styles.lockedDocument}`}>
      <div className={styles.lockedHeading}>
        <div>
          <span className={styles.documentMeta}>AUTHORITATIVE RECORD</span>
          <h1>{title}</h1>
          <p className={styles.lede}>
            {summary || "This decision has been finalized and preserved."}
          </p>
        </div>
        <Badge
          color="dark"
          variant="filled"
          size="lg"
          leftSection={<IconLock size={13} />}
        >
          Locked
        </Badge>
      </div>

      <Tabs
        defaultValue="record"
        variant="unstyled"
        className={styles.lockedRecordTabs}
        classNames={{ list: styles.lockedTabList, tab: styles.lockedTab }}
      >
        <Tabs.List aria-label="Locked decision views">
          <Tabs.Tab value="record">Record</Tabs.Tab>
          <Tabs.Tab value="evidence">Evidence</Tabs.Tab>
          <Tabs.Tab value="actions">Actions</Tabs.Tab>
          <Tabs.Tab value="reviews">Reviews</Tabs.Tab>
          <Tabs.Tab value="history">History</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="record" className={styles.lockedTabPanel}>
          <section className={styles.lockedOutcome}>
            <div className={styles.sectionIndex}>01 / CHOSEN OUTCOME</div>
            <h2>{winner?.title ?? "Selected proposal"}</h2>
            <p>
              {winner?.summary ||
                "The selected proposal is preserved in the immutable decision snapshot."}
            </p>
          </section>

          <div className={styles.lockMetadata}>
            <div>
              <span>LOCKED AT</span>
              <strong>{formatDateTime(decisionLock.locked_at)}</strong>
            </div>
            <div>
              <span>LOCKED BY</span>
              <strong>
                {lockedBy?.display_name ??
                  lockedBy?.email ??
                  "Workspace administrator"}
              </strong>
            </div>
            <div>
              <span>SNAPSHOT VERSION</span>
              <strong>{decisionLock.snapshot_version}</strong>
            </div>
          </div>

          <section className={styles.lockVerificationSection}>
            <div className={styles.lockVerificationHeading}>
              <div>
                <div className={styles.sectionIndex}>02 / VERIFICATION</div>
                <h2>Snapshot integrity</h2>
              </div>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconRefresh size={14} />}
                onClick={() => verification.refetch()}
                loading={verification.isFetching}
              >
                Verify again
              </Button>
            </div>

            {verification.isPending && (
              <div className={styles.voteReadinessState}>
                <Loader color="rust" size="xs" /> Verifying the preserved
                snapshot…
              </div>
            )}

            {verification.isError && (
              <Alert color="red" title="Snapshot could not be verified">
                {getApiErrorMessage(
                  verification.error,
                  "ForkRoom could not recalculate the snapshot hash.",
                )}
              </Alert>
            )}

            {verification.data && (
              <Alert
                color={verification.data.valid ? "green" : "red"}
                icon={
                  verification.data.valid ? (
                    <IconCircleCheck size={18} />
                  ) : (
                    <IconAlertTriangle size={18} />
                  )
                }
                title={
                  verification.data.valid
                    ? "Snapshot verified"
                    : "Snapshot verification failed"
                }
              >
                {verification.data.valid
                  ? "The current snapshot produces the same SHA-256 hash as the record created at lock time."
                  : "The recalculated hash does not match the locked record. Do not rely on an export until this is investigated."}
              </Alert>
            )}

            <div className={styles.hashRecord}>
              <span>DOCUMENT HASH / SHA-256</span>
              <code>{decisionLock.document_hash}</code>
            </div>

            {verification.data && (
              <div className={styles.hashRecord}>
                <span>COMPUTED HASH</span>
                <code>{verification.data.computed_hash}</code>
              </div>
            )}
          </section>

          <DecisionExportPanel
            workspaceId={workspaceId}
            decisionId={decisionId}
            documentHash={decisionLock.document_hash}
            verificationPending={verification.isPending}
            verificationValid={verification.data?.valid === true}
            canRequestExport={canRequestExport}
          />

          <Group className={styles.lockedRecordNote}>
            <IconLock size={17} />
            <span>
              Core content is read-only. Future changes must be recorded through
              a review or revision so this decision remains historically
              accurate.
            </span>
          </Group>
        </Tabs.Panel>

        <Tabs.Panel value="evidence" className={styles.lockedTabPanel}>
          <LockedEvidencePanel
            workspaceId={workspaceId}
            decisionLock={decisionLock}
            proposals={proposals}
            members={members}
          />
        </Tabs.Panel>

        <Tabs.Panel value="actions" className={styles.lockedTabPanel}>
          <DecisionActionsPanel
            workspaceId={workspaceId}
            decisionId={decisionId}
            members={members}
            currentUserId={currentUserId}
            canCreateActions={canCreateActions}
            canManageActions={canManageFollowThrough}
          />
        </Tabs.Panel>

        <Tabs.Panel value="reviews" className={styles.lockedTabPanel}>
          <DecisionReviewsPanel
            workspaceId={workspaceId}
            decisionId={decisionId}
            members={members}
            canManageReviews={canManageFollowThrough}
          />
        </Tabs.Panel>

        <Tabs.Panel value="history" className={styles.lockedTabPanel}>
          <DecisionHistoryPanel
            workspaceId={workspaceId}
            decisionId={decisionId}
            decisionLock={decisionLock}
            members={members}
          />
        </Tabs.Panel>
      </Tabs>
    </article>
  );
}
