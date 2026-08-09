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
import {
  Controller,
  useForm,
} from 'react-hook-form';
import { z } from 'zod';

import {
  useCreateObjection,
  useUpdateObjection,
} from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import type {
  Objection,
  ObjectionSeverity,
} from '@/services/workspace.service';

import styles from './decision-room.module.css';

const objectionSchema = z.object({
  severity: z.enum([
    'informational',
    'major',
    'blocking',
  ]),

  title: z
    .string()
    .trim()
    .min(
      3,
      'Use at least 3 characters.',
    )
    .max(200),

  description: z
    .string()
    .trim()
    .min(
      10,
      'Explain the concern in at least 10 characters.',
    )
    .max(5000),
});

type ObjectionFormValues =
  z.infer<typeof objectionSchema>;

type ObjectionEditorModalProps = {
  workspaceId: string;
  decisionId: string;
  proposalId: string;
  objection: Objection | null;
  opened: boolean;
  onClose: () => void;
  onSaved: (
    objection: Objection,
  ) => void;
};

export function ObjectionEditorModal({
  workspaceId,
  decisionId,
  proposalId,
  objection,
  opened,
  onClose,
  onSaved,
}: ObjectionEditorModalProps) {
  const createObjection =
    useCreateObjection(
      workspaceId,
      decisionId,
      proposalId,
    );

  const updateObjection =
    useUpdateObjection(
      workspaceId,
      decisionId,
      proposalId,
    );

  const isEditing =
    Boolean(objection);

  const mutation = isEditing
    ? updateObjection
    : createObjection;

  const form =
    useForm<ObjectionFormValues>({
      resolver:
        zodResolver(
          objectionSchema,
        ),

      defaultValues: {
        severity: 'major',
        title: '',
        description: '',
      },
    });

  useEffect(() => {
    if (!opened) {
      return;
    }

    form.reset({
      severity:
        objection?.severity ??
        'major',

      title:
        objection?.title ?? '',

      description:
        objection?.description ??
        '',
    });

    createObjection.reset();
    updateObjection.reset();
  }, [
    opened,
    objection,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit =
    form.handleSubmit(
      async (values) => {
        const payload = {
          severity:
            values.severity as ObjectionSeverity,

          title:
            values.title.trim(),

          description:
            values.description.trim(),
        };

        const savedObjection =
          objection
            ? await updateObjection.mutateAsync(
                {
                  objectionId:
                    objection.id,

                  payload,
                },
              )
            : await createObjection.mutateAsync(
                payload,
              );

        onSaved(
          savedObjection,
        );

        onClose();
      },
    );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        isEditing
          ? 'Edit objection'
          : 'Raise objection'
      }
      size="lg"
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
              STRUCTURED CONCERN
            </span>

            <p>
              Describe a specific
              risk or disagreement the
              team must understand
              before voting. Use
              blocking only when the
              decision must not proceed
              while this concern is
              open.
            </p>
          </div>

          <Controller
            name="severity"
            control={form.control}
            render={({
              field,
            }) => (
              <Select
                label="Severity"
                data={[
                  {
                    value:
                      'informational',

                    label:
                      'Informational - worth recording',
                  },
                  {
                    value:
                      'major',

                    label:
                      'Major - needs team attention',
                  },
                  {
                    value:
                      'blocking',

                    label:
                      'Blocking - prevents commitment',
                  },
                ]}
                value={
                  field.value
                }
                onChange={(
                  value,
                ) =>
                  field.onChange(
                    value ??
                      'major',
                  )
                }
                error={
                  form
                    .formState
                    .errors
                    .severity
                    ?.message
                }
                allowDeselect={
                  false
                }
              />
            )}
          />

          <TextInput
            label="Objection title"
            placeholder="Rollback path is not defined"
            autoFocus
            {...form.register(
              'title',
            )}
            error={
              form
                .formState
                .errors
                .title
                ?.message
            }
          />

          <Textarea
            label="Description"
            description="Explain the risk, affected assumptions, and what would address the concern."
            placeholder="Describe why this matters and what evidence or change would resolve it."
            minRows={6}
            autosize
            {...form.register(
              'description',
            )}
            error={
              form
                .formState
                .errors
                .description
                ?.message
            }
          />

          {mutation.error && (
            <Alert
              color="red"
              title="Could not save objection"
            >
              {getApiErrorMessage(
                mutation.error,
                'ForkRoom could not save this objection. Try again.',
              )}
            </Alert>
          )}

          <Group
            justify="flex-end"
            className={
              styles.proposalFormActions
            }
          >
            <Button
              variant="default"
              onClick={onClose}
              disabled={
                mutation.isPending
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              color="rust"
              loading={
                mutation.isPending
              }
            >
              {isEditing
                ? 'Save changes'
                : 'Raise objection'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}