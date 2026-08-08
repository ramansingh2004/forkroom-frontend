'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Button,
  Select,
  Textarea,
  TextInput,
} from '@mantine/core';

import {
  Controller,
  useForm,
} from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useCreateDecision } from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';

import styles from './workspace.module.css';

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Use at least 3 characters.')
    .max(200),

  summary: z
    .string()
    .trim()
    .max(1000),

  category: z.enum([
    'technology',
    'architecture',
    'delivery',
    'team_process',
    'other',
  ]),
});

type FormValues = z.infer<typeof schema>;

export function CreateDecisionForm({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();

  const createDecision =
    useCreateDecision(workspaceId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),

    defaultValues: {
      title: '',
      summary: '',
      category: 'other',
    },
  });

  const submit = form.handleSubmit(
    async (values) => {
      await createDecision.mutateAsync({
        title: values.title.trim(),

        summary:
          values.summary.trim() || null,

        category: values.category,
      });

      router.replace(
        `/w/${workspaceId}/decisions`,
      );
    },
  );

  return (
    <div className={styles.formPage}>
      <div className={styles.formIntro}>
        <span className={styles.eyebrow}>
          NEW DECISION
        </span>

        <h1>Frame the question clearly</h1>

        <p>
          Start with the decision and its context.
          Proposals, criteria, objections, and voting
          come next.
        </p>
      </div>

      <form
        className={styles.formCard}
        onSubmit={submit}
        noValidate
      >
        <TextInput
          label="Decision title"
          placeholder="Choose primary cloud platform"
          autoFocus
          {...form.register('title')}
          error={
            form.formState.errors.title?.message
          }
        />

        <Textarea
          label="Summary"
          placeholder="What are we deciding, and why now?"
          minRows={4}
          autosize
          {...form.register('summary')}
          error={
            form.formState.errors.summary?.message
          }
        />

        <Controller
          name="category"
          control={form.control}
          render={({ field }) => (
            <Select
              label="Category"
              data={[
                {
                  value: 'technology',
                  label: 'Technology',
                },
                {
                  value: 'architecture',
                  label: 'Architecture',
                },
                {
                  value: 'delivery',
                  label: 'Delivery',
                },
                {
                  value: 'team_process',
                  label: 'Team process',
                },
                {
                  value: 'other',
                  label: 'Other',
                },
              ]}
              value={field.value}
              onChange={(value) =>
                field.onChange(value ?? 'other')
              }
            />
          )}
        />

        {createDecision.isError && (
          <p
            className={styles.formError}
            role="alert"
          >
            {getApiErrorMessage(
              createDecision.error,
              'Could not create the decision. Try again.',
            )}
          </p>
        )}

        <div className={styles.formActions}>
          <Button
            component={Link}
            href={`/w/${workspaceId}/decisions`}
            variant="default"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            color="rust"
            loading={createDecision.isPending}
          >
            Create decision
          </Button>
        </div>
      </form>
    </div>
  );
}