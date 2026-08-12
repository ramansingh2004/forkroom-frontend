"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  FileInput,
  Group,
  Modal,
  Select,
  Stack,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPaperclip, IconUpload } from "@tabler/icons-react";

import {
  useUploadDecisionAttachment,
  type AttachmentUploadStage,
} from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import type { Proposal } from "@/services/workspace.service";

import styles from "./decision-room.module.css";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const DECISION_LEVEL = "decision";

type AttachmentUploadModalProps = {
  workspaceId: string;
  decisionId: string;
  proposals: Proposal[];
  opened: boolean;
  onClose: () => void;
};

const stageLabel: Record<AttachmentUploadStage, string> = {
  preparing: "Preparing a secure upload URL…",
  uploading: "Transferring the file to private storage…",
  processing: "Confirming the upload and starting verification…",
};

const formatBytes = (value: number) =>
  new Intl.NumberFormat("en", {
    style: "unit",
    unit: value >= 1024 * 1024 ? "megabyte" : "kilobyte",
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value / (value >= 1024 * 1024 ? 1024 * 1024 : 1024));

export function AttachmentUploadModal({
  workspaceId,
  decisionId,
  proposals,
  opened,
  onClose,
}: AttachmentUploadModalProps) {
  const upload = useUploadDecisionAttachment(workspaceId, decisionId);
  const [file, setFile] = useState<File | null>(null);
  const [linkTarget, setLinkTarget] = useState(DECISION_LEVEL);
  const [stage, setStage] = useState<AttachmentUploadStage>("preparing");
  const [validationError, setValidationError] = useState<string | null>(null);

  const closeModal = () => {
    setFile(null);
    setLinkTarget(DECISION_LEVEL);
    setStage("preparing");
    setValidationError(null);
    upload.reset();
    onClose();
  };

  const submit = async () => {
    if (!file) {
      setValidationError("Choose a file to attach as evidence.");
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setValidationError("This file is larger than the 25 MB upload limit.");
      return;
    }

    setValidationError(null);

    try {
      const attachment = await upload.mutateAsync({
        file,
        proposalId: linkTarget === DECISION_LEVEL ? null : linkTarget,
        onStageChange: setStage,
      });

      notifications.show({
        color: "green",
        title: "Evidence uploaded",
        message:
          attachment.status === "available"
            ? "The evidence is verified and ready to open."
            : "ForkRoom is verifying the stored file in the background.",
      });
      closeModal();
    } catch {
      // The recoverable error remains visible with the selected file intact.
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={upload.isPending ? () => undefined : closeModal}
      title="Add evidence"
      centered
      size="lg"
      closeOnClickOutside={!upload.isPending}
      closeOnEscape={!upload.isPending}
    >
      <Stack gap="md">
        <div className={styles.proposalFormIntro}>
          <span className={styles.kicker}>PRIVATE ATTACHMENT</span>
          <p>
            Upload supporting material and link it to the decision or one
            proposal. Files remain private and downloads use short-lived
            authorized links.
          </p>
        </div>

        <FileInput
          label="Evidence file"
          description="Maximum 25 MB. File-type rules are enforced by the server."
          placeholder="Choose a file"
          leftSection={<IconPaperclip size={16} />}
          value={file}
          onChange={(nextFile) => {
            setFile(nextFile);
            setValidationError(null);
            upload.reset();
          }}
          clearable
          disabled={upload.isPending}
          error={validationError}
        />

        {file && (
          <div className={styles.selectedEvidenceFile}>
            <span>SELECTED FILE</span>
            <strong>{file.name}</strong>
            <small>
              {formatBytes(file.size)} · {file.type || "Unknown media type"}
            </small>
          </div>
        )}

        <Select
          label="Link evidence to"
          description="Proposal links preserve which alternative this material supports."
          data={[
            { value: DECISION_LEVEL, label: "Decision context" },
            ...proposals.map((proposal) => ({
              value: proposal.id,
              label: proposal.title,
            })),
          ]}
          value={linkTarget}
          onChange={(value) => setLinkTarget(value ?? DECISION_LEVEL)}
          allowDeselect={false}
          searchable={proposals.length > 6}
          disabled={upload.isPending}
        />

        {upload.isPending && (
          <div
            className={styles.attachmentTransferState}
            role="status"
            aria-live="polite"
          >
            <IconUpload size={17} />
            <span>{stageLabel[stage]}</span>
          </div>
        )}

        {upload.error && (
          <Alert color="red" title="Evidence was not uploaded">
            {getApiErrorMessage(
              upload.error,
              "ForkRoom could not complete this upload. The selected file is still available here, so you can retry.",
              "attachment-upload",
            )}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={closeModal}
            disabled={upload.isPending}
          >
            Cancel
          </Button>
          <Button
            color="rust"
            leftSection={<IconUpload size={16} />}
            onClick={submit}
            loading={upload.isPending}
          >
            {upload.error ? "Retry upload" : "Upload evidence"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
