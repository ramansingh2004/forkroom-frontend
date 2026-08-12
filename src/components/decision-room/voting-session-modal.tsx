"use client";

import { useEffect } from "react";
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  TextInput,
} from "@mantine/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useCreateVotingSession } from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import type { VotingSession } from "@/services/workspace.service";

import styles from "./decision-room.module.css";

const votingSessionSchema = z.object({
  quorum_percentage: z
    .number({
      invalid_type_error: "Enter a quorum percentage.",
    })
    .int("Use a whole percentage.")
    .min(1, "Quorum must be at least 1%.")
    .max(100, "Quorum cannot exceed 100%."),

  closes_at: z
    .string()
    .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
      message: "Enter a valid closing time.",
    })
    .refine((value) => !value || new Date(value).getTime() > Date.now(), {
      message: "Closing time must be in the future.",
    }),
});

type VotingSessionFormValues = z.infer<typeof votingSessionSchema>;

type VotingSessionModalProps = {
  workspaceId: string;
  decisionId: string;
  opened: boolean;
  onClose: () => void;
  onCreated: (session: VotingSession) => void;
};

export function VotingSessionModal({
  workspaceId,
  decisionId,
  opened,
  onClose,
  onCreated,
}: VotingSessionModalProps) {
  const createSession = useCreateVotingSession(workspaceId, decisionId);

  const form = useForm<VotingSessionFormValues>({
    resolver: zodResolver(votingSessionSchema),

    defaultValues: {
      quorum_percentage: 60,
      closes_at: "",
    },
  });

  useEffect(() => {
    if (!opened) return;

    form.reset({
      quorum_percentage: 60,
      closes_at: "",
    });

    createSession.reset();
  }, [opened]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = form.handleSubmit(async (values) => {
    try {
      const session = await createSession.mutateAsync({
        quorum_percentage: values.quorum_percentage,

        closes_at: values.closes_at
          ? new Date(values.closes_at).toISOString()
          : null,
      });

      onCreated(session);
      onClose();
    } catch {
      // Keep the selected rules in place and show the contextual error below.
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create voting round"
      size="md"
      centered
      classNames={{
        content: styles.proposalModal,

        header: styles.proposalModalHeader,
      }}
    >
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <div className={styles.proposalFormIntro}>
            <span className={styles.kicker}>VOTING RULES</span>

            <p>
              Create the round as a draft. Review submitted proposals and
              blocking objections before opening it to eligible members.
            </p>
          </div>

          <Controller
            name="quorum_percentage"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Quorum percentage"
                description="The minimum share of eligible voters required for a valid result."
                min={1}
                max={100}
                step={1}
                suffix="%"
                value={field.value}
                onChange={(value) => field.onChange(Number(value))}
                error={form.formState.errors.quorum_percentage?.message}
              />
            )}
          />

          <TextInput
            type="datetime-local"
            label="Closes at (optional)"
            description="This records the voting window; closing remains a facilitator action."
            {...form.register("closes_at")}
            error={form.formState.errors.closes_at?.message}
          />

          {createSession.error && (
            <Alert color="red" title="Could not create voting round">
              {getApiErrorMessage(
                createSession.error,
                "ForkRoom could not create this voting round.",
                "create-voting-round",
              )}
            </Alert>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={onClose}
              disabled={createSession.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              color="rust"
              loading={createSession.isPending}
            >
              Create draft round
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
