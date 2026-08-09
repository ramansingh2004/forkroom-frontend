"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Image,
  Loader,
  Modal,
  Select,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconDownload,
  IconExternalLink,
  IconFile,
  IconFileText,
  IconPaperclip,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";

import {
  useAttachmentDownload,
  useDecisionAttachments,
  useDeleteAttachment,
} from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import type {
  Attachment,
  Proposal,
  WorkspaceMember,
} from "@/services/workspace.service";

import { AttachmentUploadModal } from "./attachment-upload-modal";
import styles from "./decision-room.module.css";

type EvidencePanelProps = {
  workspaceId: string;
  decisionId: string;
  proposals: Proposal[];
  members: WorkspaceMember[];
  currentUserId: string;
  canUpload: boolean;
  canManage: boolean;
};

type PreviewState = {
  attachment: Pick<Attachment, "id" | "filename" | "media_type">;
  url: string;
  expiresAt: string;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const statusColor = (status: Attachment["status"]) => {
  if (status === "available") return "green";
  if (status === "rejected") return "red";
  if (status === "deleted") return "gray";
  return "orange";
};

const isPreviewable = (mediaType: string) =>
  mediaType.startsWith("image/") || mediaType === "application/pdf";

function EvidenceIcon({ mediaType }: { mediaType: string }) {
  if (mediaType.startsWith("image/")) return <IconPhoto size={18} />;
  if (mediaType === "application/pdf") return <IconFileText size={18} />;
  return <IconFile size={18} />;
}

function AttachmentPreview({
  preview,
  onClose,
}: {
  preview: PreviewState | null;
  onClose: () => void;
}) {
  return (
    <Modal
      opened={Boolean(preview)}
      onClose={onClose}
      title={preview?.attachment.filename ?? "Evidence preview"}
      size="xl"
      centered
    >
      {preview?.attachment.media_type.startsWith("image/") && (
        <Image
          src={preview.url}
          alt={`Preview of ${preview.attachment.filename}`}
          className={styles.evidencePreviewImage}
          fit="contain"
        />
      )}

      {preview?.attachment.media_type === "application/pdf" && (
        <iframe
          src={preview.url}
          title={`Preview of ${preview.attachment.filename}`}
          className={styles.evidencePreviewFrame}
        />
      )}

      {preview && (
        <Group justify="space-between" className={styles.previewFooter}>
          <span>Secure link expires {formatDateTime(preview.expiresAt)}</span>
          <Button
            component="a"
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="default"
            leftSection={<IconExternalLink size={15} />}
          >
            Open separately
          </Button>
        </Group>
      )}
    </Modal>
  );
}

export function EvidencePanel({
  workspaceId,
  decisionId,
  proposals,
  members,
  currentUserId,
  canUpload,
  canManage,
}: EvidencePanelProps) {
  const attachments = useDecisionAttachments(workspaceId, decisionId);
  const removeAttachment = useDeleteAttachment(workspaceId, decisionId);
  const createDownload = useAttachmentDownload(workspaceId);
  const [uploadOpened, setUploadOpened] = useState(false);
  const [filter, setFilter] = useState("all");
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(
    null,
  );
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const proposalById = useMemo(
    () => new Map(proposals.map((proposal) => [proposal.id, proposal])),
    [proposals],
  );
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member])),
    [members],
  );

  const visibleAttachments = (attachments.data ?? [])
    .filter((attachment) => attachment.status !== "deleted")
    .filter((attachment) => {
      if (filter === "all") return true;
      if (filter === "decision") return !attachment.proposal_id;
      return attachment.proposal_id === filter;
    })
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    );

  const requestLink = async (
    attachment: Attachment,
    mode: "preview" | "download",
  ) => {
    setActiveAttachmentId(attachment.id);

    try {
      const result = await createDownload.mutateAsync(attachment.id);

      if (mode === "preview" && isPreviewable(attachment.media_type)) {
        setPreview({
          attachment,
          url: result.download_url,
          expiresAt: result.expires_at,
        });
        return;
      }

      const link = document.createElement("a");
      link.href = result.download_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Could not open evidence",
        message: getApiErrorMessage(
          error,
          "ForkRoom could not create a fresh download link.",
        ),
      });
    } finally {
      setActiveAttachmentId(null);
    }
  };

  const confirmRemove = (attachment: Attachment) => {
    modals.openConfirmModal({
      title: "Remove this attachment?",
      children: (
        <p className={styles.confirmCopy}>
          “{attachment.filename}” will be removed from live decision evidence
          and its stored object will no longer be downloadable. Locked snapshots
          remain immutable.
        </p>
      ),
      labels: { confirm: "Remove attachment", cancel: "Keep attachment" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await removeAttachment.mutateAsync(attachment.id);
          notifications.show({
            color: "green",
            title: "Attachment removed",
            message: "The file is no longer part of live decision evidence.",
          });
        } catch (error) {
          notifications.show({
            color: "red",
            title: "Could not remove attachment",
            message: getApiErrorMessage(
              error,
              "ForkRoom rejected this attachment removal.",
            ),
          });
        }
      },
    });
  };

  return (
    <div className={styles.evidencePanel}>
      <div className={styles.evidencePanelHeader}>
        <div>
          <span className={styles.kicker}>EVIDENCE</span>
          <strong>Supporting files</strong>
        </div>
        <Button
          size="compact-xs"
          color="rust"
          leftSection={<IconPlus size={14} />}
          onClick={() => setUploadOpened(true)}
          disabled={!canUpload}
        >
          Add
        </Button>
      </div>

      {!canUpload && (
        <Alert color="gray" title="Evidence is read-only">
          Uploads and removals are disabled during voting and after the decision
          becomes read-only.
        </Alert>
      )}

      <Select
        aria-label="Filter evidence by link target"
        value={filter}
        onChange={(value) => setFilter(value ?? "all")}
        allowDeselect={false}
        data={[
          { value: "all", label: "All decision evidence" },
          { value: "decision", label: "Decision context only" },
          ...proposals.map((proposal) => ({
            value: proposal.id,
            label: proposal.title,
          })),
        ]}
      />

      {attachments.isPending && (
        <div className={styles.evidenceLoading} role="status">
          <Loader size="xs" color="rust" /> Loading evidence…
        </div>
      )}

      {attachments.isError && (
        <Alert color="red" title="Evidence could not be loaded">
          {getApiErrorMessage(
            attachments.error,
            "ForkRoom could not load attachments for this decision.",
          )}
        </Alert>
      )}

      {!attachments.isPending &&
        !attachments.isError &&
        visibleAttachments.length === 0 && (
          <div className={styles.evidenceEmpty}>
            <IconPaperclip size={24} />
            <strong>No evidence in this view</strong>
            <span>Add a source file or choose another proposal filter.</span>
          </div>
        )}

      <div className={styles.evidenceList} aria-live="polite">
        {visibleAttachments.map((attachment) => {
          const uploader = memberById.get(attachment.uploaded_by_id);
          const proposal = attachment.proposal_id
            ? proposalById.get(attachment.proposal_id)
            : null;
          const canRemove =
            canUpload &&
            (canManage || attachment.uploaded_by_id === currentUserId);
          const isOpening =
            createDownload.isPending && activeAttachmentId === attachment.id;

          return (
            <article key={attachment.id} className={styles.evidenceCard}>
              <div className={styles.evidenceIdentity}>
                <span className={styles.evidenceFileIcon}>
                  <EvidenceIcon mediaType={attachment.media_type} />
                </span>
                <div>
                  <strong title={attachment.filename}>
                    {attachment.filename}
                  </strong>
                  <span>
                    {formatBytes(attachment.size_bytes)} ·{" "}
                    {proposal?.title ?? "Decision context"}
                  </span>
                </div>
                <Badge
                  size="xs"
                  variant="light"
                  color={statusColor(attachment.status)}
                >
                  {attachment.status}
                </Badge>
              </div>

              <div className={styles.evidenceMeta}>
                <span>
                  Uploaded by{" "}
                  {uploader?.display_name ??
                    uploader?.email ??
                    "Workspace member"}
                </span>
                <span>{formatDateTime(attachment.created_at)}</span>
              </div>

              {(attachment.status === "pending" ||
                attachment.status === "processing") && (
                <div className={styles.evidenceProcessing} role="status">
                  <Loader size={12} color="orange" />
                  {attachment.status === "pending"
                    ? "Waiting for upload confirmation"
                    : "Verifying size and SHA-256"}
                </div>
              )}

              {attachment.status === "rejected" && (
                <Alert color="red" title="Processing rejected">
                  {attachment.processing_error ||
                    "The server could not verify this stored file."}
                </Alert>
              )}

              {attachment.sha256 && (
                <code className={styles.evidenceHash} title={attachment.sha256}>
                  SHA-256 {attachment.sha256}
                </code>
              )}

              <Group gap="xs" className={styles.evidenceActions}>
                {attachment.status === "available" &&
                  isPreviewable(attachment.media_type) && (
                    <Button
                      size="compact-xs"
                      variant="default"
                      onClick={() => requestLink(attachment, "preview")}
                      loading={isOpening}
                    >
                      Preview
                    </Button>
                  )}
                {attachment.status === "available" && (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="dark"
                    leftSection={<IconDownload size={14} />}
                    onClick={() => requestLink(attachment, "download")}
                    loading={isOpening}
                  >
                    Download
                  </Button>
                )}
                {attachment.status === "rejected" && canUpload && (
                  <Button
                    size="compact-xs"
                    variant="light"
                    color="rust"
                    leftSection={<IconRefresh size={14} />}
                    onClick={() => setUploadOpened(true)}
                  >
                    Retry with file
                  </Button>
                )}
                {canRemove && (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => confirmRemove(attachment)}
                    loading={
                      removeAttachment.isPending &&
                      removeAttachment.variables === attachment.id
                    }
                  >
                    Remove
                  </Button>
                )}
              </Group>
            </article>
          );
        })}
      </div>

      {createDownload.error && (
        <Alert color="red" title="Secure link could not be created">
          Request the file again. Download links are intentionally short-lived.
        </Alert>
      )}

      <AttachmentUploadModal
        workspaceId={workspaceId}
        decisionId={decisionId}
        proposals={proposals}
        opened={uploadOpened}
        onClose={() => setUploadOpened(false)}
      />

      <AttachmentPreview preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
