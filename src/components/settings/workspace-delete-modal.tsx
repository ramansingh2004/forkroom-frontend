'use client';

import { useState } from 'react';
import { Alert, Button, Checkbox, Modal, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useDeleteWorkspace } from '@/hooks/use-workspaces';
import { clearWorkspaceLocalState } from '@/lib/workspace-cleanup';
import { getApiErrorMessage } from '@/services/auth.service';
import { useUiStore } from '@/stores/use-ui-store';
import styles from './workspace-settings.module.css';

type WorkspaceDeleteModalProps = {
  opened: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
};

export function WorkspaceDeleteModal({
  opened,
  onClose,
  workspaceId,
  workspaceName,
}: WorkspaceDeleteModalProps) {
  const router = useRouter();
  const deleteWorkspace = useDeleteWorkspace(workspaceId);
  const activeWorkspaceId = useUiStore((state) => state.activeWorkspaceId);
  const setActiveWorkspaceId = useUiStore(
    (state) => state.setActiveWorkspaceId,
  );
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const matches = confirmation === workspaceName;
  const canDelete = matches && acknowledged && !deleteWorkspace.isPending;

  const close = () => {
    if (deleteWorkspace.isPending) return;
    setConfirmation('');
    setAcknowledged(false);
    deleteWorkspace.reset();
    onClose();
  };

  const confirmDelete = async () => {
    if (!canDelete) return;

    try {
      await deleteWorkspace.mutateAsync();
      clearWorkspaceLocalState(workspaceId);
      if (activeWorkspaceId === workspaceId) setActiveWorkspaceId(null);
      notifications.show({
        color: 'green',
        title: 'Workspace deleted',
        message: `${workspaceName} is no longer available.`,
      });
      router.replace('/workspaces');
    } catch {
      // Keep the modal open so the server rejection remains visible.
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      closeOnClickOutside={!deleteWorkspace.isPending}
      closeOnEscape={!deleteWorkspace.isPending}
      withCloseButton={!deleteWorkspace.isPending}
      title="Delete workspace permanently?"
      centered
      size="lg"
      classNames={{ content: styles.deleteModal, title: styles.deleteModalTitle }}
    >
      <div className={styles.deleteModalBody}>
        <Alert
          color="red"
          icon={<IconAlertTriangle size={19} />}
          title="This action cannot be undone in ForkRoom"
        >
          The server will delete this workspace. Export any records you need
          before continuing. ForkRoom will return you to the workspace list
          after the deletion succeeds.
        </Alert>

        <div className={styles.deleteChecklist}>
          <strong>Before you delete</strong>
          <ul>
            <li>Confirm that required locked-decision exports are downloaded.</li>
            <li>Tell workspace members that access will end.</li>
            <li>Verify that you selected the correct workspace.</li>
          </ul>
        </div>

        <TextInput
          label={
            <>
              Type <strong>{workspaceName}</strong> to confirm
            </>
          }
          value={confirmation}
          onChange={(event) => setConfirmation(event.currentTarget.value)}
          error={confirmation.length > 0 && !matches ? 'Workspace name does not match.' : undefined}
          autoComplete="off"
          disabled={deleteWorkspace.isPending}
        />

        <Checkbox
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.currentTarget.checked)}
          label="I understand that ForkRoom does not provide an undo action for this deletion."
          disabled={deleteWorkspace.isPending}
        />

        {deleteWorkspace.isError && (
          <Alert color="red" title="Workspace was not deleted">
            {getApiErrorMessage(
              deleteWorkspace.error,
              'ForkRoom could not delete this workspace. Your workspace remains unchanged.',
            )}
          </Alert>
        )}

        <div className={styles.deleteModalActions}>
          <Button variant="default" onClick={close} disabled={deleteWorkspace.isPending}>
            Keep workspace
          </Button>
          <Button
            color="red"
            leftSection={<IconTrash size={16} />}
            disabled={!canDelete}
            loading={deleteWorkspace.isPending}
            onClick={() => void confirmDelete()}
          >
            Delete workspace
          </Button>
        </div>
      </div>
    </Modal>
  );
}