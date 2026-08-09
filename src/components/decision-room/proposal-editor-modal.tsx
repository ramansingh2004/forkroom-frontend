'use client';

import { useEffect } from 'react';
import { Alert, Badge, Button, Group, Modal, Stack, Textarea, TextInput } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useCreateProposal, useUpdateProposal } from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import type { Proposal } from '@/services/workspace.service';

import styles from './decision-room.module.css';

const proposalSchema = z.object({
  title: z.string().trim().min(3, 'Use at least 3 characters.').max(200),
  summary: z.string().trim().max(1000),
  content: z.string().trim().max(20_000),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

type ProposalEditorModalProps = {
  workspaceId: string;
  decisionId: string;
  proposal: Proposal | null;
  opened: boolean;
  onClose: () => void;
  onSaved: (proposal: Proposal) => void;
};

export function ProposalEditorModal({
  workspaceId,
  decisionId,
  proposal,
  opened,
  onClose,
  onSaved,
}: ProposalEditorModalProps) {
  const createProposal = useCreateProposal(workspaceId, decisionId);
  const updateProposal = useUpdateProposal(workspaceId, decisionId);
  const isEditing = Boolean(proposal);
  const mutation = isEditing ? updateProposal : createProposal;
  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: '',
      summary: '',
      content: '',
    },
  });

  useEffect(() => {
    if (!opened) return;

    form.reset({
      title: proposal?.title ?? '',
      summary: proposal?.summary ?? '',
      content: proposal?.content ?? '',
    });
    createProposal.reset();
    updateProposal.reset();
  }, [opened, proposal]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      title: values.title.trim(),
      summary: values.summary.trim() || null,
      content: values.content.trim() || null,
    };

    const savedProposal = proposal
      ? await updateProposal.mutateAsync({ proposalId: proposal.id, payload })
      : await createProposal.mutateAsync(payload);

    onSaved(savedProposal);
    onClose();
  });

  const error = mutation.error;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? 'Edit proposal' : 'Add proposal'}
      size="lg"
      centered
      classNames={{ content: styles.proposalModal, header: styles.proposalModalHeader }}
    >
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <div className={styles.proposalFormIntro}>
            <span className={styles.kicker}>ALTERNATIVE</span>
            <p>
              Develop one clear path without overwriting the other alternatives in this decision.
            </p>
            {proposal && (
              <Badge variant="light" color={proposal.status === 'submitted' ? 'green' : 'gray'}>
                {proposal.status}
              </Badge>
            )}
          </div>

          <TextInput
            label="Proposal title"
            placeholder="Single EC2 host with Docker Compose"
            autoFocus
            {...form.register('title')}
            error={form.formState.errors.title?.message}
          />

          <Textarea
            label="Summary"
            description="A short explanation used in lists and comparisons."
            placeholder="Describe the approach in one or two sentences."
            minRows={3}
            autosize
            {...form.register('summary')}
            error={form.formState.errors.summary?.message}
          />

          <Textarea
            label="Rationale and details"
            description="Capture the implementation, tradeoffs, risks, and assumptions."
            placeholder="Explain how this proposal works and what the team should consider."
            minRows={7}
            autosize
            {...form.register('content')}
            error={form.formState.errors.content?.message}
          />

          {error && (
            <Alert color="red" title="Could not save proposal">
              {getApiErrorMessage(error, 'ForkRoom could not save this proposal. Try again.')}
            </Alert>
          )}

          <Group justify="flex-end" className={styles.proposalFormActions}>
            <Button variant="default" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" color="rust" loading={mutation.isPending}>
              {isEditing ? 'Save changes' : 'Create proposal'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
