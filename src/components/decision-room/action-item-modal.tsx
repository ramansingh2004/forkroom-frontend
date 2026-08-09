'use client';

import { useEffect } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  useCreateDecisionAction,
  useUpdateDecisionAction,
} from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import type {
  DecisionAction,
  WorkspaceMember,
} from '@/services/workspace.service';

import styles from './decision-room.module.css';

const actionItemSchema = z.object({
  title: z.string().trim().min(1, 'Enter an action title.'),
  description: z.string(),
  assignee_id: z.string().min(1, 'Choose an assignee.'),
  due_at: z.string(),
});

type ActionItemFormValues = z.infer<typeof actionItemSchema>;

type ActionItemModalProps = {
  workspaceId: string;
  decisionId: string;
  members: WorkspaceMember[];
  action: DecisionAction | null;
  opened: boolean;
  onClose: () => void;
};

const toLocalInput = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export function ActionItemModal({
  workspaceId,
  decisionId,
  members,
  action,
  opened,
  onClose,
}: ActionItemModalProps) {
  const createAction = useCreateDecisionAction(workspaceId, decisionId);
  const updateAction = useUpdateDecisionAction(workspaceId, decisionId);
  const mutation = action ? updateAction : createAction;
  const form = useForm<ActionItemFormValues>({
    resolver: zodResolver(actionItemSchema),
    defaultValues: {
      title: '',
      description: '',
      assignee_id: '',
      due_at: '',
    },
  });

  useEffect(() => {
    if (!opened) return;
    form.reset({
      title: action?.title ?? '',
      description: action?.description ?? '',
      assignee_id: action?.assignee_id ?? '',
      due_at: toLocalInput(action?.due_at ?? null),
    });
    createAction.reset();
    updateAction.reset();
  }, [opened, action]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      title: values.title,
      description: values.description.trim() || null,
      assignee_id: values.assignee_id,
      due_at: values.due_at ? new Date(values.due_at).toISOString() : null,
    };

    if (action) {
      await updateAction.mutateAsync({ actionId: action.id, payload });
    } else {
      await createAction.mutateAsync(payload);
    }

    onClose();
  });

  const memberOptions = members.map((member) => ({
    value: member.user_id,
    label: member.display_name ?? member.email,
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={action ? 'Edit action item' : 'Add action item'}
      size="md"
      centered
      closeOnClickOutside={!mutation.isPending}
      closeOnEscape={!mutation.isPending}
      classNames={{
        content: styles.proposalModal,
        header: styles.proposalModalHeader,
      }}
    >
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <div className={styles.proposalFormIntro}>
            <span className={styles.kicker}>OWNED FOLLOW-THROUGH</span>
            <p>
              Keep implementation work attached to the locked decision so its
              owner, state, and deadline remain part of the record.
            </p>
          </div>

          <TextInput
            label="Action"
            placeholder="Provision the staging environment"
            {...form.register('title')}
            error={form.formState.errors.title?.message}
          />

          <Textarea
            label="Description (optional)"
            minRows={3}
            autosize
            {...form.register('description')}
          />

          <Controller
            name="assignee_id"
            control={form.control}
            render={({ field }) => (
              <Select
                label="Assignee"
                data={memberOptions}
                searchable
                value={field.value}
                onChange={(value) => field.onChange(value ?? '')}
                error={form.formState.errors.assignee_id?.message}
              />
            )}
          />

          <TextInput
            type="datetime-local"
            label="Due at (optional)"
            {...form.register('due_at')}
          />

          {mutation.error && (
            <Alert color="red" title="Action item could not be saved">
              {getApiErrorMessage(
                mutation.error,
                'ForkRoom could not save this action item.',
              )}
            </Alert>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" color="rust" loading={mutation.isPending}>
              {action ? 'Save changes' : 'Add action'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
