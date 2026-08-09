'use client';

import { useEffect } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  useCreateDecisionReview,
  useUpdateDecisionReview,
} from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import type { DecisionReview } from '@/services/workspace.service';

import styles from './decision-room.module.css';

const reviewScheduleSchema = z.object({
  scheduled_for: z
    .string()
    .min(1, 'Choose a review date and time.')
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: 'The review must be scheduled in the future.',
    }),
  notes: z.string(),
});

type ReviewScheduleFormValues = z.infer<typeof reviewScheduleSchema>;

type ReviewScheduleModalProps = {
  workspaceId: string;
  decisionId: string;
  review: DecisionReview | null;
  opened: boolean;
  onClose: () => void;
};

const toLocalInput = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export function ReviewScheduleModal({
  workspaceId,
  decisionId,
  review,
  opened,
  onClose,
}: ReviewScheduleModalProps) {
  const createReview = useCreateDecisionReview(workspaceId, decisionId);
  const updateReview = useUpdateDecisionReview(workspaceId, decisionId);
  const mutation = review ? updateReview : createReview;
  const form = useForm<ReviewScheduleFormValues>({
    resolver: zodResolver(reviewScheduleSchema),
    defaultValues: { scheduled_for: '', notes: '' },
  });

  useEffect(() => {
    if (!opened) return;
    form.reset({
      scheduled_for: toLocalInput(review?.scheduled_for ?? null),
      notes: review?.notes ?? '',
    });
    createReview.reset();
    updateReview.reset();
  }, [opened, review]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      scheduled_for: new Date(values.scheduled_for).toISOString(),
      notes: values.notes.trim() || null,
    };

    if (review) {
      await updateReview.mutateAsync({ reviewId: review.id, payload });
    } else {
      await createReview.mutateAsync(payload);
    }

    onClose();
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={review ? 'Reschedule review' : 'Schedule decision review'}
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
            <span className={styles.kicker}>DECISION CHECKPOINT</span>
            <p>
              Schedule when the team should revisit assumptions and record
              whether this locked decision still stands.
            </p>
          </div>

          <TextInput
            type="datetime-local"
            label="Review date and time"
            {...form.register('scheduled_for')}
            error={form.formState.errors.scheduled_for?.message}
          />

          <Textarea
            label="Review notes (optional)"
            description="Record the assumptions, signals, or results the team should examine."
            minRows={4}
            autosize
            {...form.register('notes')}
          />

          {mutation.error && (
            <Alert color="red" title="Review could not be scheduled">
              {getApiErrorMessage(
                mutation.error,
                'ForkRoom could not save this review checkpoint.',
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
              {review ? 'Save schedule' : 'Schedule review'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
