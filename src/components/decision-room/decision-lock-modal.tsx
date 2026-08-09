'use client';

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
} from '@mantine/core';
import { IconAlertTriangle, IconLock } from '@tabler/icons-react';

import { useCreateDecisionLock } from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import type {
  DecisionLock,
  Proposal,
  VotingResult,
  VotingSession,
} from '@/services/workspace.service';

import styles from './decision-room.module.css';

type DecisionLockModalProps = {
  workspaceId: string;
  decisionId: string;
  session: VotingSession;
  result: VotingResult;
  winner: Proposal;
  openObjectionCount: number;
  opened: boolean;
  onClose: () => void;
  onLocked: (decisionLock: DecisionLock) => void;
};

export function DecisionLockModal({
  workspaceId,
  decisionId,
  session,
  result,
  winner,
  openObjectionCount,
  opened,
  onClose,
  onLocked,
}: DecisionLockModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const lockDecision = useCreateDecisionLock(workspaceId, decisionId);

  const closeModal = () => {
    setAcknowledged(false);
    lockDecision.reset();
    onClose();
  };

  const submit = async () => {
    if (!acknowledged || lockDecision.isPending) return;

    try {
      const decisionLock = await lockDecision.mutateAsync({
        voting_session_id: session.id,
      });

      onLocked(decisionLock);
      closeModal();
    } catch {
      // The API error is shown inside the modal.
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={closeModal}
      title="Lock this decision?"
      size="lg"
      centered
      closeOnClickOutside={!lockDecision.isPending}
      closeOnEscape={!lockDecision.isPending}
      classNames={{
        content: styles.proposalModal,
        header: styles.proposalModalHeader,
      }}
    >
      <Stack gap="md">
        <Alert
          color="orange"
          icon={<IconAlertTriangle size={18} />}
          title="This creates the authoritative decision record"
        >
          ForkRoom will preserve the selected outcome, voting result, proposal
          content, objections, eligibility, and snapshot hash. Core decision
          content cannot be edited after locking.
        </Alert>

        <div className={styles.lockOutcomePreview}>
          <span className={styles.kicker}>SELECTED OUTCOME</span>
          <h3>{winner.title}</h3>
          <p>{winner.summary || 'No proposal summary was provided.'}</p>
          <Badge color="green" variant="light">
            Valid result
          </Badge>
        </div>

        <div className={styles.lockConfirmationMetrics}>
          <div>
            <span>PARTICIPATION</span>
            <strong>
              {result.votes_cast} / {result.eligible_voter_count}
            </strong>
          </div>
          <div>
            <span>QUORUM</span>
            <strong>
              {result.quorum_met ? 'Met' : 'Not met'} · {result.required_votes}{' '}
              required
            </strong>
          </div>
          <div>
            <span>OPEN OBJECTIONS</span>
            <strong>{openObjectionCount}</strong>
          </div>
        </div>

        {openObjectionCount > 0 && (
          <Alert color="orange" title="Unresolved concerns will remain visible">
            {openObjectionCount} open objection
            {openObjectionCount === 1 ? '' : 's'} will be preserved as part of
            the decision record. Locking does not erase dissent.
          </Alert>
        )}

        <Checkbox
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.currentTarget.checked)}
          label="I understand that the selected outcome and its preserved reasoning become immutable after locking."
        />

        {lockDecision.error && (
          <Alert color="red" title="Decision was not locked">
            {getApiErrorMessage(
              lockDecision.error,
              'ForkRoom rejected this lock. Confirm that the voting result is valid and try again.',
            )}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={closeModal}
            disabled={lockDecision.isPending}
          >
            Review result
          </Button>
          <Button
            color="dark"
            leftSection={<IconLock size={16} />}
            onClick={submit}
            loading={lockDecision.isPending}
            disabled={!acknowledged}
          >
            Lock decision
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
