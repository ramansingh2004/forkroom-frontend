'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
} from '@mantine/core';
import {
  IconArrowRight,
  IconCalendarEvent,
  IconChecklist,
  IconChevronDown,
  IconFileDescription,
  IconGitBranch,
  IconHistory,
  IconLock,
  IconScale,
} from '@tabler/icons-react';

import {
  useDecision,
  useDecisionActions,
  useDecisionRevision,
  useDecisionRevisions,
  useDecisionReviews,
  useVotingSessions,
} from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import type {
  DecisionLock,
  WorkspaceMember,
} from '@/services/workspace.service';

import styles from './decision-room.module.css';

type DecisionHistoryPanelProps = {
  workspaceId: string;
  decisionId: string;
  decisionLock: DecisionLock;
  members: WorkspaceMember[];
};

type AuditEventKind =
  | 'decision'
  | 'voting'
  | 'lock'
  | 'action'
  | 'review'
  | 'revision';

type AuditEvent = {
  id: string;
  kind: AuditEventKind;
  title: string;
  summary: string;
  at: string;
  actorId: string | null;
};

const PAGE_SIZE = 12;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const sentenceCase = (value: string) =>
  value.replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase());

const shortId = (value: string) => `${value.slice(0, 8)}…${value.slice(-4)}`;

const eventColor = (kind: AuditEventKind) => {
  if (kind === 'lock') return 'dark';
  if (kind === 'revision') return 'violet';
  if (kind === 'review') return 'blue';
  if (kind === 'action') return 'green';
  if (kind === 'voting') return 'orange';
  return 'gray';
};

const eventIcon = (kind: AuditEventKind) => {
  if (kind === 'lock') return <IconLock size={15} />;
  if (kind === 'revision') return <IconGitBranch size={15} />;
  if (kind === 'review') return <IconCalendarEvent size={15} />;
  if (kind === 'action') return <IconChecklist size={15} />;
  if (kind === 'voting') return <IconScale size={15} />;
  return <IconFileDescription size={15} />;
};

export function DecisionHistoryPanel({
  workspaceId,
  decisionId,
  decisionLock,
  members,
}: DecisionHistoryPanelProps) {
  const [visibleEventCount, setVisibleEventCount] = useState(PAGE_SIZE);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>();
  const decision = useDecision(workspaceId, decisionId);
  const votingSessions = useVotingSessions(workspaceId, decisionId);
  const actions = useDecisionActions(workspaceId, decisionId);
  const reviews = useDecisionReviews(workspaceId, decisionId);
  const revisions = useDecisionRevisions(workspaceId, decisionId);
  const revisionDetail = useDecisionRevision(
    workspaceId,
    decisionId,
    selectedRevisionId,
  );

  const memberName = (userId: string | null) => {
    if (!userId) return 'Actor not exposed by this API record';
    const member = members.find((candidate) => candidate.user_id === userId);
    return member?.display_name || member?.email || `Former member ${shortId(userId)}`;
  };

  const events: AuditEvent[] = [];

  if (decision.data) {
    events.push({
      id: `decision-created-${decision.data.id}`,
      kind: 'decision',
      title: 'Decision created',
      summary: decision.data.title,
      at: decision.data.created_at,
      actorId: decision.data.created_by_id,
    });
  }

  for (const session of votingSessions.data ?? []) {
    events.push({
      id: `voting-created-${session.id}`,
      kind: 'voting',
      title: 'Voting round created',
      summary: `Quorum set to ${session.quorum_percentage}% for ${session.eligible_voter_count} eligible voters.`,
      at: session.created_at,
      actorId: session.created_by_id,
    });

    if (session.opened_at) {
      events.push({
        id: `voting-opened-${session.id}`,
        kind: 'voting',
        title: 'Voting opened',
        summary: 'The ballot became available to eligible members.',
        at: session.opened_at,
        actorId: null,
      });
    }

    if (session.closed_at) {
      events.push({
        id: `voting-closed-${session.id}`,
        kind: 'voting',
        title: 'Voting closed',
        summary: 'The backend finalized this round and calculated its result.',
        at: session.closed_at,
        actorId: null,
      });
    }

    if (session.cancelled_at) {
      events.push({
        id: `voting-cancelled-${session.id}`,
        kind: 'voting',
        title: 'Voting cancelled',
        summary: 'The cancelled round remains preserved in voting history.',
        at: session.cancelled_at,
        actorId: null,
      });
    }
  }

  events.push({
    id: `lock-${decisionLock.id}`,
    kind: 'lock',
    title: 'Decision locked',
    summary: `Snapshot v${decisionLock.snapshot_version} was preserved with SHA-256 verification.`,
    at: decisionLock.locked_at,
    actorId: decisionLock.locked_by_id,
  });

  for (const action of actions.data ?? []) {
    events.push({
      id: `action-created-${action.id}`,
      kind: 'action',
      title: 'Action assigned',
      summary: `${action.title} · assigned to ${memberName(action.assignee_id)}.`,
      at: action.created_at,
      actorId: action.created_by_id,
    });

    if (action.completed_at) {
      events.push({
        id: `action-completed-${action.id}`,
        kind: 'action',
        title: 'Action completed',
        summary: action.title,
        at: action.completed_at,
        actorId: null,
      });
    }

    if (action.cancelled_at) {
      events.push({
        id: `action-cancelled-${action.id}`,
        kind: 'action',
        title: 'Action cancelled',
        summary: action.title,
        at: action.cancelled_at,
        actorId: null,
      });
    }
  }

  for (const review of reviews.data ?? []) {
    events.push({
      id: `review-scheduled-${review.id}`,
      kind: 'review',
      title: 'Review scheduled',
      summary: `Review date: ${formatDateTime(review.scheduled_for)}.`,
      at: review.created_at,
      actorId: review.scheduled_by_id,
    });

    if (review.completed_at) {
      events.push({
        id: `review-completed-${review.id}`,
        kind: 'review',
        title: `Review ${sentenceCase(review.outcome ?? 'completed')}`,
        summary: review.outcome_rationale || 'A review outcome was recorded.',
        at: review.completed_at,
        actorId: review.completed_by_id,
      });
    }

    if (review.cancelled_at) {
      events.push({
        id: `review-cancelled-${review.id}`,
        kind: 'review',
        title: 'Review cancelled',
        summary: review.notes || 'The scheduled review was cancelled.',
        at: review.cancelled_at,
        actorId: review.cancelled_by_id,
      });
    }
  }

  for (const revision of revisions.data ?? []) {
    events.push({
      id: `revision-${revision.id}`,
      kind: 'revision',
      title: `Revision ${revision.revision_number} linked`,
      summary: revision.rationale,
      at: revision.created_at,
      actorId: revision.created_by_id,
    });
  }

  events.sort((left, right) =>
    right.at.localeCompare(left.at),
  );

  const auditPending =
    decision.isPending ||
    votingSessions.isPending ||
    actions.isPending ||
    reviews.isPending ||
    revisions.isPending;
  const auditError =
    decision.isError ||
    votingSessions.isError ||
    actions.isError ||
    reviews.isError ||
    revisions.isError;
  const orderedRevisions = [...(revisions.data ?? [])].sort(
    (left, right) => right.revision_number - left.revision_number,
  );
  const selectedRevision = revisionDetail.data;

  return (
    <div className={styles.historyPanel}>
      <div className={styles.followThroughHeading}>
        <div>
          <div className={styles.sectionIndex}>01 / REVISION CHAIN</div>
          <h2>Immutable revisions</h2>
          <p>
            Reviews may link this locked record to a successor decision. Each link
            preserves the predecessor instead of rewriting it.
          </p>
        </div>
        <Badge color="dark" variant="light" size="lg">
          Snapshot v{decisionLock.snapshot_version}
        </Badge>
      </div>

      {revisions.isPending && (
        <div className={styles.voteReadinessState}>
          <Loader color="rust" size="xs" /> Loading revision links…
        </div>
      )}

      {revisions.isError && (
        <Alert color="red" title="Revision history could not be loaded">
          {getApiErrorMessage(
            revisions.error,
            'ForkRoom could not load the immutable revision chain.',
          )}
        </Alert>
      )}

      {!revisions.isPending && !revisions.isError && orderedRevisions.length === 0 && (
        <div className={styles.historyEmpty}>
          <IconGitBranch size={25} />
          <strong>This is the only locked version</strong>
          <span>
            Reopened or superseded review outcomes will add immutable successor
            links here.
          </span>
        </div>
      )}

      {orderedRevisions.length > 0 && (
        <div className={styles.revisionList}>
          {orderedRevisions.map((revision) => (
            <article key={revision.id} className={styles.revisionCard}>
              <div className={styles.revisionMarker}>
                <IconGitBranch size={17} />
                <span>R{String(revision.revision_number).padStart(2, '0')}</span>
              </div>
              <div className={styles.revisionContent}>
                <Group justify="space-between" align="flex-start" gap="sm">
                  <div>
                    <strong>Revision {revision.revision_number}</strong>
                    <span>
                      {memberName(revision.created_by_id)} ·{' '}
                      {formatDateTime(revision.created_at)}
                    </span>
                  </div>
                  <Badge
                    color={revision.outcome === 'superseded' ? 'violet' : 'orange'}
                    variant="light"
                  >
                    {revision.outcome}
                  </Badge>
                </Group>
                <p>{revision.rationale}</p>
                <div className={styles.revisionPath}>
                  <code>{shortId(revision.predecessor_decision_id)}</code>
                  <IconArrowRight size={14} />
                  <code>{shortId(revision.successor_decision_id)}</code>
                </div>
                <Group gap="xs">
                  <Button
                    component={Link}
                    href={`/w/${workspaceId}/decisions/${revision.predecessor_decision_id}`}
                    variant="default"
                    size="xs"
                    prefetch={false}
                  >
                    Open predecessor
                  </Button>
                  <Button
                    component={Link}
                    href={`/w/${workspaceId}/decisions/${revision.successor_decision_id}`}
                    color="rust"
                    size="xs"
                    prefetch={false}
                  >
                    Open successor
                  </Button>
                  <Button
                    variant="subtle"
                    color="dark"
                    size="xs"
                    onClick={() => setSelectedRevisionId(revision.id)}
                  >
                    Inspect link
                  </Button>
                </Group>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className={styles.auditSection}>
        <div className={styles.followThroughHeading}>
          <div>
            <div className={styles.sectionIndex}>02 / AUDIT TIMELINE</div>
            <h2>Decision record events</h2>
            <p>
              Durable lifecycle events from the decision, voting, lock, actions,
              reviews, and revision records.
            </p>
          </div>
          <Badge color="gray" variant="light" leftSection={<IconHistory size={13} />}>
            {events.length} events
          </Badge>
        </div>

        <Alert color="blue" variant="light" title="Contract-backed history">
          The current API does not expose a general field-level activity feed.
          This timeline uses only durable timestamps and actor fields that the
          backend returns, and marks events where an actor is not exposed.
        </Alert>

        {auditPending && (
          <div className={styles.voteReadinessState}>
            <Loader color="rust" size="xs" /> Loading decision history…
          </div>
        )}

        {auditError && (
          <Alert color="red" title="Some audit records could not be loaded">
            ForkRoom could not assemble the complete contract-backed timeline.
            Retry after the unavailable decision resources can be read.
          </Alert>
        )}

        {!auditPending && events.length === 0 && (
          <div className={styles.historyEmpty}>
            <IconHistory size={25} />
            <strong>No durable events found</strong>
            <span>Activity will appear as this decision moves through its lifecycle.</span>
          </div>
        )}

        {events.length > 0 && (
          <>
            <ol className={styles.auditTimeline}>
              {events.slice(0, visibleEventCount).map((event) => (
                <li key={event.id} className={styles.auditEvent}>
                  <div
                    className={styles.auditEventIcon}
                    data-kind={event.kind}
                    aria-hidden="true"
                  >
                    {eventIcon(event.kind)}
                  </div>
                  <div className={styles.auditEventBody}>
                    <Group justify="space-between" align="flex-start" gap="sm">
                      <div>
                        <strong>{event.title}</strong>
                        <p>{event.summary}</p>
                      </div>
                      <Badge color={eventColor(event.kind)} variant="light" size="sm">
                        {event.kind}
                      </Badge>
                    </Group>
                    <span>
                      {memberName(event.actorId)} · {formatDateTime(event.at)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>

            {visibleEventCount < events.length && (
              <Button
                variant="default"
                leftSection={<IconChevronDown size={15} />}
                onClick={() =>
                  setVisibleEventCount((current) => current + PAGE_SIZE)
                }
              >
                Show older events
              </Button>
            )}
          </>
        )}
      </section>

      <Modal
        opened={Boolean(selectedRevisionId)}
        onClose={() => setSelectedRevisionId(undefined)}
        title="Immutable revision link"
        centered
        size="lg"
      >
        {revisionDetail.isPending && (
          <div className={styles.voteReadinessState}>
            <Loader color="rust" size="xs" /> Loading revision metadata…
          </div>
        )}

        {revisionDetail.isError && (
          <Alert color="red" title="Revision could not be loaded">
            {getApiErrorMessage(
              revisionDetail.error,
              'ForkRoom could not load this revision link.',
            )}
          </Alert>
        )}

        {selectedRevision && (
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <div className={styles.sectionIndex}>REVISION LINK</div>
                <h3 className={styles.revisionModalTitle}>
                  Revision {selectedRevision.revision_number}
                </h3>
              </div>
              <Badge color="violet" variant="light">
                {selectedRevision.outcome}
              </Badge>
            </Group>

            <p className={styles.revisionModalRationale}>
              {selectedRevision.rationale}
            </p>

            <div className={styles.revisionMetadata}>
              <div>
                <span>CREATED BY</span>
                <strong>{memberName(selectedRevision.created_by_id)}</strong>
              </div>
              <div>
                <span>CREATED AT</span>
                <strong>{formatDateTime(selectedRevision.created_at)}</strong>
              </div>
              <div>
                <span>SOURCE LOCK</span>
                <code>{shortId(selectedRevision.source_lock_id)}</code>
              </div>
              <div>
                <span>REVIEW</span>
                <code>{shortId(selectedRevision.review_id)}</code>
              </div>
            </div>

            <Group justify="flex-end">
              <Button
                component={Link}
                href={`/w/${workspaceId}/decisions/${selectedRevision.predecessor_decision_id}`}
                variant="default"
                prefetch={false}
              >
                Predecessor
              </Button>
              <Button
                component={Link}
                href={`/w/${workspaceId}/decisions/${selectedRevision.successor_decision_id}`}
                color="rust"
                rightSection={<IconArrowRight size={15} />}
                prefetch={false}
              >
                Successor decision
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </div>
  );
}
