"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  FileInput,
  Group,
  Modal,
  Select,
  Stack,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconFile,
  IconPaperclip,
  IconRefresh,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";

import {
  useDecisionAttachments,
  useDeleteAttachment,
  useUploadDecisionAttachment,
  type AttachmentUploadStage,
} from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import type { Attachment, Proposal } from "@/services/workspace.service";

import styles from "./decision-room.module.css";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const DECISION_LEVEL = "decision";

type QueueStage = AttachmentUploadStage | "available" | "failed";

type QueueItem = {
  id: string;
  file: File;
  stage: QueueStage;
  error: string | null;
  attachmentId: string | null;
  proposalId: string | null;
};

type AttachmentUploadModalProps = {
  workspaceId: string;
  decisionId: string;
  proposals: Proposal[];
  retryAttachment: Attachment | null;
  opened: boolean;
  onClose: () => void;
};

const stageLabel: Record<QueueStage, string> = {
  preparing: "Preparing",
  uploading: "Uploading",
  processing: "Processing",
  available: "Available",
  failed: "Failed",
};

const formatBytes = (value: number) =>
  new Intl.NumberFormat("en", {
    style: "unit",
    unit: value >= 1024 * 1024 ? "megabyte" : "kilobyte",
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value / (value >= 1024 * 1024 ? 1024 * 1024 : 1024));

const createQueueId = (file: File) =>
  `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;

export function AttachmentUploadModal({
  workspaceId,
  decisionId,
  proposals,
  retryAttachment,
  opened,
  onClose,
}: AttachmentUploadModalProps) {
  const upload = useUploadDecisionAttachment(workspaceId, decisionId);
  const removeAttachment = useDeleteAttachment(workspaceId, decisionId);
  const attachments = useDecisionAttachments(workspaceId, decisionId, opened);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [linkTarget, setLinkTarget] = useState(DECISION_LEVEL);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const proposalById = useMemo(
    () => new Map(proposals.map((proposal) => [proposal.id, proposal])),
    [proposals],
  );

  useEffect(() => {
    if (!opened) return;

    setSelectedFiles([]);
    setQueue([]);
    setLinkTarget(retryAttachment?.proposal_id ?? DECISION_LEVEL);
    setActiveItemId(null);
    setValidationError(null);
    upload.reset();
  }, [opened, retryAttachment?.id]);

  useEffect(() => {
    if (!attachments.data) return;
    const attachmentById = new Map(
      attachments.data.map((attachment) => [attachment.id, attachment]),
    );

    setQueue((current) =>
      current.map((item) => {
        if (!item.attachmentId) return item;
        const attachment = attachmentById.get(item.attachmentId);
        if (!attachment) return item;

        if (attachment.status === "available") {
          return { ...item, stage: "available", error: null };
        }
        if (attachment.status === "processing") {
          return { ...item, stage: "processing", error: null };
        }
        if (attachment.status === "rejected") {
          return {
            ...item,
            stage: "failed",
            error:
              attachment.processing_error ??
              "ForkRoom could not verify this stored file.",
          };
        }
        return item;
      }),
    );
  }, [attachments.data]);

  const isBusy = upload.isPending || removeAttachment.isPending;
  const retryableItems = queue.filter(
    (item) => item.stage === "preparing" || item.stage === "failed",
  );
  const queueComplete =
    queue.length > 0 &&
    queue.every(
      (item) => item.stage === "available" || item.stage === "processing",
    );

  const updateItem = (id: string, values: Partial<QueueItem>) => {
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...values } : item)),
    );
  };

  const closeModal = () => {
    if (isBusy) return;
    setSelectedFiles([]);
    setQueue([]);
    setLinkTarget(DECISION_LEVEL);
    setActiveItemId(null);
    setValidationError(null);
    upload.reset();
    onClose();
  };

  const selectFiles = (files: File[]) => {
    setSelectedFiles(files);
    setValidationError(null);
    upload.reset();

    const oversized = files.filter((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (oversized.length > 0) {
      setValidationError(
        `${oversized.map((file) => file.name).join(", ")} exceed the 25 MB upload limit.`,
      );
    }

    const proposalId = linkTarget === DECISION_LEVEL ? null : linkTarget;
    setQueue(
      files.map((file) => ({
        id: createQueueId(file),
        file,
        stage: file.size > MAX_ATTACHMENT_BYTES ? "failed" : "preparing",
        error:
          file.size > MAX_ATTACHMENT_BYTES
            ? "This file is larger than the 25 MB upload limit."
            : null,
        attachmentId: null,
        proposalId,
      })),
    );
  };

  const changeLinkTarget = (value: string | null) => {
    const nextTarget = value ?? DECISION_LEVEL;
    const proposalId = nextTarget === DECISION_LEVEL ? null : nextTarget;
    setLinkTarget(nextTarget);
    setQueue((current) =>
      current.map((item) =>
        item.stage === "preparing" || item.stage === "failed"
          ? { ...item, proposalId }
          : item,
      ),
    );
  };

  const uploadItems = async (itemIds: string[]) => {
    const items = queue.filter((item) => itemIds.includes(item.id));
    if (items.length === 0) {
      setValidationError("Choose at least one file to upload.");
      return;
    }

    setValidationError(null);
    let completed = 0;

    for (const item of items) {
      if (item.file.size > MAX_ATTACHMENT_BYTES) continue;
      setActiveItemId(item.id);

      try {
        if (item.stage === "failed" && item.attachmentId) {
          await removeAttachment.mutateAsync(item.attachmentId);
          updateItem(item.id, { attachmentId: null });
        }

        updateItem(item.id, { stage: "preparing", error: null });
        const attachment = await upload.mutateAsync({
          file: item.file,
          proposalId: item.proposalId,
          onPrepared: (prepared) =>
            updateItem(item.id, { attachmentId: prepared.id }),
          onStageChange: (stage) => updateItem(item.id, { stage, error: null }),
        });

        updateItem(item.id, {
          attachmentId: attachment.id,
          stage: attachment.status === "available" ? "available" : "processing",
          error: null,
        });
        completed += 1;
      } catch (error) {
        updateItem(item.id, {
          stage: "failed",
          error: getApiErrorMessage(
            error,
            "ForkRoom could not complete this upload. Retry the file or ask a workspace administrator for help.",
            "attachment-upload",
          ),
        });
      } finally {
        setActiveItemId(null);
      }
    }

    if (completed > 0) {
      notifications.show({
        color: "green",
        title:
          completed === 1 ? "Evidence uploaded" : "Evidence queue uploaded",
        message:
          completed === 1
            ? "The file is processing and will become available here."
            : `${completed} files are processing and will become available here.`,
      });
    }
  };

  const removeQueueItem = async (item: QueueItem) => {
    if (item.attachmentId) {
      try {
        setActiveItemId(item.id);
        await removeAttachment.mutateAsync(item.attachmentId);
      } catch (error) {
        updateItem(item.id, {
          error: getApiErrorMessage(
            error,
            "ForkRoom could not remove the failed upload record.",
          ),
        });
        setActiveItemId(null);
        return;
      }
    }

    setQueue((current) => current.filter((entry) => entry.id !== item.id));
    setSelectedFiles((current) => current.filter((file) => file !== item.file));
    setActiveItemId(null);
  };

  return (
    <Modal
      opened={opened}
      onClose={closeModal}
      title={retryAttachment ? "Retry evidence" : "Add evidence"}
      centered
      size="lg"
      closeOnClickOutside={!isBusy}
      closeOnEscape={!isBusy}
    >
      <Stack gap="md">
        <div className={styles.proposalFormIntro}>
          <span className={styles.kicker}>EVIDENCE UPLOAD QUEUE</span>
          <p>
            Add sources without leaving the Decision Room. Each file keeps its
            reasoning link and remains visible through preparation, transfer,
            processing, and availability.
          </p>
        </div>

        {retryAttachment && (
          <Alert color="orange" title="Choose the file again to retry">
            Browser security prevents ForkRoom from reusing the original local
            file. The replacement will keep the{" "}
            {retryAttachment.proposal_id
              ? `proposal link to “${proposalById.get(retryAttachment.proposal_id)?.title ?? "the original proposal"}.”`
              : "decision-context link."}
          </Alert>
        )}

        <FileInput
          multiple
          label="Evidence files"
          description="Maximum 25 MB per file. File-type rules are enforced by the server."
          placeholder="Choose one or more files"
          leftSection={<IconPaperclip size={16} />}
          value={selectedFiles}
          onChange={selectFiles}
          clearable
          disabled={isBusy}
          error={validationError}
        />

        <Select
          label="Link evidence to"
          description="The selected reasoning link is preserved with every queued file."
          data={[
            { value: DECISION_LEVEL, label: "Decision context" },
            ...proposals.map((proposal) => ({
              value: proposal.id,
              label: `Proposal · ${proposal.title}`,
            })),
          ]}
          value={linkTarget}
          onChange={changeLinkTarget}
          allowDeselect={false}
          searchable={proposals.length > 6}
          disabled={isBusy || queue.some((item) => item.stage === "processing")}
        />

        {queue.length > 0 && (
          <section className={styles.uploadQueue} aria-label="Upload queue">
            <div className={styles.uploadQueueHeader}>
              <strong>Upload queue</strong>
              <span>
                {queue.filter((item) => item.stage === "available").length}/
                {queue.length} available
              </span>
            </div>

            <div className={styles.uploadQueueList} aria-live="polite">
              {queue.map((item) => {
                const proposal = item.proposalId
                  ? proposalById.get(item.proposalId)
                  : null;
                const itemBusy = activeItemId === item.id;

                return (
                  <article
                    key={item.id}
                    className={styles.uploadQueueItem}
                    data-stage={item.stage}
                  >
                    <div className={styles.uploadQueueIdentity}>
                      <span>
                        {item.stage === "available" ? (
                          <IconCheck size={16} />
                        ) : (
                          <IconFile size={16} />
                        )}
                      </span>
                      <div>
                        <strong title={item.file.name}>{item.file.name}</strong>
                        <small>
                          {formatBytes(item.file.size)} ·{" "}
                          {proposal
                            ? `Proposal · ${proposal.title}`
                            : "Decision context"}
                        </small>
                      </div>
                      <b>{stageLabel[item.stage]}</b>
                    </div>

                    <div className={styles.uploadQueueTrack}>
                      {(
                        [
                          "preparing",
                          "uploading",
                          "processing",
                          "available",
                        ] as const
                      ).map((stage) => {
                        const order = [
                          "preparing",
                          "uploading",
                          "processing",
                          "available",
                        ] as const;
                        const currentIndex =
                          item.stage === "failed"
                            ? order.length
                            : order.indexOf(item.stage);
                        const index = order.indexOf(stage);
                        return (
                          <span
                            key={stage}
                            data-complete={
                              index < currentIndex ||
                              item.stage === "available" ||
                              undefined
                            }
                            data-active={
                              stage === item.stage ? true : undefined
                            }
                          >
                            <i />
                            {stageLabel[stage]}
                          </span>
                        );
                      })}
                    </div>

                    {item.error && (
                      <Alert color="red" title="Upload failed">
                        {item.error}
                      </Alert>
                    )}

                    {(item.stage === "failed" ||
                      item.stage === "preparing") && (
                      <Group gap="xs" justify="flex-end">
                        {item.stage === "failed" &&
                          item.file.size <= MAX_ATTACHMENT_BYTES && (
                            <Button
                              size="compact-xs"
                              variant="light"
                              color="rust"
                              leftSection={<IconRefresh size={13} />}
                              onClick={() => uploadItems([item.id])}
                              loading={itemBusy}
                              disabled={isBusy && !itemBusy}
                            >
                              Retry
                            </Button>
                          )}
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          color="red"
                          leftSection={<IconTrash size={13} />}
                          onClick={() => removeQueueItem(item)}
                          loading={itemBusy && removeAttachment.isPending}
                          disabled={isBusy && !itemBusy}
                        >
                          Remove
                        </Button>
                      </Group>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <Group justify="space-between">
          <Button variant="default" onClick={closeModal} disabled={isBusy}>
            {queueComplete ? "Done" : "Cancel"}
          </Button>
          <Tooltip
            label={
              retryableItems.length === 0
                ? "Choose at least one file before starting the upload."
                : `Upload ${retryableItems.length} queued ${retryableItems.length === 1 ? "file" : "files"}.`
            }
          >
            <span>
              <Button
                color="rust"
                leftSection={<IconUpload size={16} />}
                onClick={() =>
                  uploadItems(retryableItems.map((item) => item.id))
                }
                loading={upload.isPending}
                disabled={isBusy || retryableItems.length === 0}
              >
                {retryableItems.length > 1
                  ? `Upload ${retryableItems.length} files`
                  : retryableItems[0]?.stage === "failed"
                    ? "Retry upload"
                    : "Upload evidence"}
              </Button>
            </span>
          </Tooltip>
        </Group>
      </Stack>
    </Modal>
  );
}