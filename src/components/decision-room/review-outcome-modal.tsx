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
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { useCompleteDecisionReview } from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import type {
  DecisionReview,
  ReviewOutcomeResponse,
} from '@/services/workspace.service';

import styles from './decision-room.module.css';

const reviewOutcomeSchema = z
  .object({
    outcome: z.enum(['confirmed', 'reopened', 'superseded']),
    rationale: z.string().trim().min(1, 'Explain the review outcome.'),
    successor_title: z.string(),
    successor_summary: z.string(),
    successor_category: z.enum([
      'technology',
      'architecture',
      'delivery',
      'team_process',
      'other',
    ]),
  })
  .superRefine((values, context) => {
    if (values.outcome === 'superseded' && !values.successor_title.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['successor_title'],
        message: 'Name the successor decision.',
      });
    }
  });

type ReviewOutcomeFormValues = z.infer<typeof reviewOutcomeSchema>;

type ReviewOutcomeModalProps = {
  workspaceId: string;
  decisionId: string;
  review: DecisionReview | null;
  opened: boolean;
  onClose: () => void;
  onCompleted: (result: ReviewOutcomeResponse) => void;
};

export function ReviewOutcomeModal({
  workspaceId,
  decisionId,
  review,
  opened,
  onClose,
  onCompleted,
}: ReviewOutcomeModalProps) {
  const completeReview = useCompleteDecisionReview(workspaceId, decisionId);
  const form = useForm<ReviewOutcomeFormValues>({
    resolver: zodResolver(reviewOutcomeSchema),
    defaultValues: {
      outcome: 'confirmed',
      rationale: '',
      successor_title: '',
      successor_summary: '',
      successor_category: 'other',
    },
  });
  const outcome = useWatch({ control: form.control, name: 'outcome' });

  useEffect(() => {
    if (!opened) return;
    form.reset({
      outcome: 'confirmed',
      rationale: '',
      successor_title: '',
      successor_summary: '',
      successor_category: 'other',
    });
    completeReview.reset();
  }, [opened, review]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = form.handleSubmit(async (values) => {
    if (!review) return;
    const result = await completeReview.mutateAsync({
      reviewId: review.id,
      payload: {
        outcome: values.outcome,
        rationale: values.rationale,
        successor_title:
          values.outcome === 'superseded'
            ? values.successor_title.trim()
            : null,
        successor_summary:
          values.outcome === 'superseded'
            ? values.successor_summary.trim() || null
            : null,
        successor_category:
          values.outcome === 'superseded'
            ? values.successor_category
            : null,
      },
    });

    onCompleted(result);
    onClose();
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Record review outcome"
      size="lg"
      centered
      closeOnClickOutside={!completeReview.isPending}
      closeOnEscape={!completeReview.isPending}
      classNames={{
        content: styles.proposalModal,
        header: styles.proposalModalHeader,
      }}
    >
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <Alert color="orange" title="This outcome becomes part of the audit record">
            Confirming preserves the current decision. Reopening records a
            revision path. Superseding creates a linked successor decision
            without changing this locked snapshot.
          </Alert>

          <Controller
            name="outcome"
            control={form.control}
            render={({ field }) => (
              <Select
                label="Outcome"
                data={[
                  { value: 'confirmed', label: 'Confirm decision' },
                  { value: 'reopened', label: 'Reopen for revision' },
                  { value: 'superseded', label: 'Supersede with a new decision' },
                ]}
                value={field.value}
                onChange={(value) => field.onChange(value ?? 'confirmed')}
                allowDeselect={false}
              />
            )}
          />

          <Textarea
            label="Rationale"
            description="Explain what evidence or changed assumptions support this outcome."
            minRows={4}
            autosize
            {...form.register('rationale')}
            error={form.formState.errors.rationale?.message}
          />

          {outcome === 'superseded' && (
            <div className={styles.successorFields}>
              <span className={styles.kicker}>SUCCESSOR DECISION</span>
              <TextInput
                label="Title"
                {...form.register('successor_title')}
                error={form.formState.errors.successor_title?.message}
              />
              <Textarea
                label="Summary (optional)"
                minRows={3}
                autosize
                {...form.register('successor_summary')}
              />
              <Controller
                name="successor_category"
                control={form.control}
                render={({ field }) => (
                  <Select
                    label="Category"
                    data={[
                      { value: 'technology', label: 'Technology' },
                      { value: 'architecture', label: 'Architecture' },
                      { value: 'delivery', label: 'Delivery' },
                      { value: 'team_process', label: 'Team process' },
                      { value: 'other', label: 'Other' },
                    ]}
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? 'other')}
                    allowDeselect={false}
                  />
                )}
              />
            </div>
          )}

          {completeReview.error && (
            <Alert color="red" title="Review outcome was not recorded">
              {getApiErrorMessage(
                completeReview.error,
                'ForkRoom could not record this review outcome.',
              )}
            </Alert>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={onClose}
              disabled={completeReview.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" color="dark" loading={completeReview.isPending}>
              Record outcome
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
