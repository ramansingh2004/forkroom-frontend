'use client';

import { useEffect } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAddWorkspaceMember } from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import type { AssignableWorkspaceRole } from '@/services/workspace.service';
import styles from './members.module.css';

const addMemberSchema = z.object({
  email: z.string().trim().email('Enter a valid account email.'),
  role: z.enum(['admin', 'member', 'viewer']),
});

type AddMemberValues = z.infer<typeof addMemberSchema>;

type MemberAddModalProps = {
  workspaceId: string;
  opened: boolean;
  assignableRoles: AssignableWorkspaceRole[];
  onClose: () => void;
  onAdded: (memberUserId: string) => void;
};

const roleCopy: Record<AssignableWorkspaceRole, string> = {
  admin: 'Admin - facilitates decisions and manages workspace operations',
  member: 'Member - contributes proposals, objections, scores, and votes',
  viewer: 'Viewer - reads workspace records without editing',
};

export function MemberAddModal({
  workspaceId,
  opened,
  assignableRoles,
  onClose,
  onAdded,
}: MemberAddModalProps) {
  const addMember = useAddWorkspaceMember(workspaceId);
  const form = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: '', role: 'member' },
  });

  useEffect(() => {
    if (!opened) return;
    form.reset({ email: '', role: 'member' });
    addMember.reset();
  }, [opened]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = form.handleSubmit(async (values) => {
    if (!assignableRoles.includes(values.role)) {
      form.setError('role', {
        message: 'You cannot assign this role.',
      });
      return;
    }

    const member = await addMember.mutateAsync({
      email: values.email.trim().toLocaleLowerCase(),
      role: values.role,
    });

    notifications.show({
      color: 'green',
      title: 'Member added',
      message: `${member.display_name} can now access this workspace as ${member.role}.`,
    });
    onAdded(member.user_id);
    onClose();
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add workspace member"
      size="md"
      centered
      closeOnClickOutside={!addMember.isPending}
      closeOnEscape={!addMember.isPending}
      classNames={{
        content: styles.memberModal,
        header: styles.memberModalHeader,
      }}
    >
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <div className={styles.memberModalIntro}>
            <span className={styles.kicker}>IMMEDIATE WORKSPACE ACCESS</span>
            <p>
              Add an existing ForkRoom account by email. This API creates the
              membership immediately; it does not send a pending invitation.
            </p>
          </div>

          <TextInput
            label="Account email"
            placeholder="maya@example.com"
            autoComplete="email"
            {...form.register('email')}
            error={form.formState.errors.email?.message}
          />

          <Controller
            name="role"
            control={form.control}
            render={({ field }) => (
              <Select
                label="Workspace role"
                data={assignableRoles.map((role) => ({
                  value: role,
                  label: roleCopy[role],
                }))}
                value={field.value}
                onChange={(value) =>
                  field.onChange((value ?? 'member') as AssignableWorkspaceRole)
                }
                allowDeselect={false}
                error={form.formState.errors.role?.message}
              />
            )}
          />

          {addMember.error && (
            <Alert color="red" title="Member could not be added">
              {getApiErrorMessage(
                addMember.error,
                'ForkRoom could not add this account. Confirm the account exists and is not already a member.',
              )}
            </Alert>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={onClose}
              disabled={addMember.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" color="rust" loading={addMember.isPending}>
              Add member
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
