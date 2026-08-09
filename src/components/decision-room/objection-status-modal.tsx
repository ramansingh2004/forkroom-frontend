'use client';

import { useEffect } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Textarea,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useTransitionObjection } from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import type {
  Objection,
  ObjectionStatus,
} from '@/services/workspace.service';

import styles from './decision-room.module.css';

const transitionSchema = z.object({
  note: z
    .string()
    .trim()
    .min(
      3,
      'Add a short explanation.',
    )
    .max(2000),
});

type TransitionFormValues =
  z.infer<
    typeof transitionSchema
  >;

type ObjectionStatusModalProps = {
  workspaceId: string;
  decisionId: string;
  proposalId: string;
  objection: Objection | null;
  nextStatus:
    | ObjectionStatus
    | null;
  opened: boolean;
  onClose: () => void;
  onTransitioned: (
    objection: Objection,
  ) => void;
};

const actionCopy: Record<
  ObjectionStatus,
  {
    title: string;
    description: string;
    label: string;
    color: string;
  }
> = {
  open: {
    title: 'Reopen objection',
    description:
      'Explain what changed or why this concern needs attention again.',
    label: 'Reopen objection',
    color: 'rust',
  },

  resolved: {
    title: 'Resolve objection',
    description:
      'Record how the proposal or supporting evidence addressed the concern.',
    label: 'Mark resolved',
    color: 'green',
  },

  dismissed: {
    title: 'Dismiss objection',
    description:
      'Record why the team accepts the risk or considers the concern inapplicable.',
    label: 'Dismiss objection',
    color: 'orange',
  },
};

export function ObjectionStatusModal({
  workspaceId,
  decisionId,
  proposalId,
  objection,
  nextStatus,
  opened,
  onClose,
  onTransitioned,
}: ObjectionStatusModalProps) {
  const transitionObjection =
    useTransitionObjection(
      workspaceId,
      decisionId,
      proposalId,
    );

  const form =
    useForm<TransitionFormValues>({
      resolver:
        zodResolver(
          transitionSchema,
        ),

      defaultValues: {
        note: '',
      },
    });

  useEffect(() => {
    if (!opened) {
      return;
    }

    form.reset({
      note: '',
    });

    transitionObjection.reset();
  }, [
    opened,
    objection?.id,
    nextStatus,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  if (
    !objection ||
    !nextStatus
  ) {
    return null;
  }

  const copy =
    actionCopy[nextStatus];

  const submit =
    form.handleSubmit(
      async (values) => {
        const updated =
          await transitionObjection.mutateAsync(
            {
              objectionId:
                objection.id,

              payload: {
                status:
                  nextStatus,

                note:
                  values.note.trim(),
              },
            },
          );

        onTransitioned(
          updated,
        );

        onClose();
      },
    );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={copy.title}
      size="md"
      centered
      classNames={{
        content:
          styles.proposalModal,

        header:
          styles.proposalModalHeader,
      }}
    >
      <form
        onSubmit={submit}
        noValidate
      >
        <Stack gap="md">
          <div
            className={
              styles.proposalFormIntro
            }
          >
            <span
              className={
                styles.kicker
              }
            >
              STATUS CHANGE
            </span>

            <p>
              {copy.description}
            </p>
          </div>

          <Textarea
            label="Status note"
            placeholder="Explain this change for the decision record."
            minRows={4}
            autosize
            autoFocus
            {...form.register(
              'note',
            )}
            error={
              form
                .formState
                .errors
                .note
                ?.message
            }
          />

          {transitionObjection.error && (
            <Alert
              color="red"
              title="Could not update objection"
            >
              {getApiErrorMessage(
                transitionObjection.error,
                'ForkRoom could not change this objection state.',
              )}
            </Alert>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={onClose}
              disabled={
                transitionObjection.isPending
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              color={copy.color}
              loading={
                transitionObjection.isPending
              }
            >
              {copy.label}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}