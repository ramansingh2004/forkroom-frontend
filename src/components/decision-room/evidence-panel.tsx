"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Select,
  Skeleton,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconDownload,
  IconEye,
  IconFile,
  IconFileText,
  IconLink,
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
import {
  EvidencePreview,
  type EvidencePreviewItem,
  isEvidencePreviewable,
} from "./evidence-preview";
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
  attachmentId: string;
  item: EvidencePreviewItem;
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

const mediaTypeLabel = (mediaType: string) => {
  if (mediaType === "application/pdf") return "PDF";
  if (mediaType.startsWith("image/"))
    return mediaType.slice("image/".length).toUpperCase();
  if (mediaType === "text/markdown") return "Markdown";
  if (mediaType.startsWith("text/")) return "Text";
  return mediaType.split("/").at(-1)?.toUpperCase() ?? "File";
};

const statusDetails: Record<
  Attachment["status"],
  { label: string; color: string }
> = {
  pending: { label: "Preparing", color: "orange" },
  processing: { label: "Processing", color: "orange" },
  available: { label: "Available", color: "gray" },
  rejected: { label: "Failed", color: "red" },
  deleted: { label: "Removed", color: "gray" },
};

function EvidenceIcon({ mediaType }: { mediaType: string }) {
  if (mediaType.startsWith("image/")) return <IconPhoto size={17} />;
  if (mediaType === "application/pdf") return <IconFileText size={17} />;
  return <IconFile size={17} />;
}

function UploadStateTrack({ status }: { status: Attachment["status"] }) {
  const labels = ["Preparing", "Uploading", "Processing", "Available"];
  const activeIndex =
    status === "pending" ? 0 : status === "processing" ? 2 : 3;
  const failed = status === "rejected";

  return (
    <div
      className={styles.evidenceStateTrack}
      data-failed={failed || undefined}
      role="status"
      aria-label={
        failed
          ? "Upload failed during processing"
          : `Upload ${labels[activeIndex]}`
      }
    >
      {labels.map((label, index) => (
        <span
          key={label}
          data-complete={
            index < activeIndex || status === "available" || undefined
          }
          data-active={index === activeIndex && !failed ? true : undefined}
          data-failed={index === 3 && failed ? true : undefined}
        >
          <i />
          {index === 3 && failed ? "Failed" : label}
        </span>
      ))}
    </div>
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
  const [retryAttachment, setRetryAttachment] = useState<Attachment | null>(
    null,
  );
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

  const openUpload = (attachment: Attachment | null = null) => {
    setRetryAttachment(attachment);
    setUploadOpened(true);
  };

  const requestLink = async (
    attachment: Attachment,
    mode: "preview" | "download",
  ) => {
    setActiveAttachmentId(attachment.id);

    try {
      const result = await createDownload.mutateAsync(attachment.id);

      if (mode === "preview" && isEvidencePreviewable(attachment.media_type)) {
        const uploader = memberById.get(attachment.uploaded_by_id);
        const proposal = attachment.proposal_id
          ? proposalById.get(attachment.proposal_id)
          : null;

        setPreview({
          attachmentId: attachment.id,
          item: {
            filename: attachment.filename,
            mediaType: attachment.media_type,
            sizeLabel: formatBytes(attachment.size_bytes),
            uploaderLabel:
              uploader?.display_name ?? uploader?.email ?? "Workspace member",
            uploadedAt: attachment.created_at,
            reasoningLabel: proposal
              ? `Proposal · ${proposal.title}`
              : "Decision context",
            url: result.download_url,
            expiresAt: result.expires_at,
          },
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
          "attachment-download",
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
          if (preview?.attachmentId === attachment.id) setPreview(null);
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
          <strong>Reasoning sources</strong>
        </div>
        <Tooltip
          label={
            canUpload
              ? "Add supporting evidence"
              : "Uploads are unavailable during voting and after the decision becomes read-only."
          }
        >
          <span>
            <Button
              size="compact-xs"
              color="rust"
              leftSection={<IconPlus size={14} />}
              onClick={() => openUpload()}
              disabled={!canUpload}
            >
              Add
            </Button>
          </span>
        </Tooltip>
      </div>

      {preview ? (
        <EvidencePreview item={preview.item} onBack={() => setPreview(null)} />
      ) : (
        <>
          {!canUpload && (
            <Alert color="gray" title="Evidence is read-only">
              Uploads and removals are disabled during voting and after the
              decision becomes read-only.
            </Alert>
          )}

          <Select
            aria-label="Filter evidence by reasoning link"
            value={filter}
            onChange={(value) => setFilter(value ?? "all")}
            allowDeselect={false}
            data={[
              { value: "all", label: "All reasoning links" },
              { value: "decision", label: "Decision context" },
              ...proposals.map((proposal) => ({
                value: proposal.id,
                label: `Proposal · ${proposal.title}`,
              })),
            ]}
          />

          {attachments.isPending && (
            <div
              className={styles.evidenceList}
              role="status"
              aria-label="Loading evidence"
            >
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} height={132} radius={0} />
              ))}
            </div>
          )}

          {attachments.isError && (
            <Alert color="red" title="Evidence could not be loaded">
              {getApiErrorMessage(
                attachments.error,
                "ForkRoom could not load attachments for this decision.",
              )}
              <Button
                mt="sm"
                size="compact-sm"
                variant="default"
                leftSection={<IconRefresh size={14} />}
                onClick={() => void attachments.refetch()}
              >
                Retry evidence
              </Button>
            </Alert>
          )}

          {!attachments.isPending &&
            !attachments.isError &&
            visibleAttachments.length === 0 && (
              <div className={styles.evidenceEmpty}>
                <IconPaperclip size={24} />
                <strong>No evidence in this view</strong>
                <span>
                  Add a source that supports the decision or one of its
                  proposals.
                </span>
                {canUpload && (
                  <Button
                    size="compact-xs"
                    variant="light"
                    color="rust"
                    onClick={() => openUpload()}
                  >
                    Add first source
                  </Button>
                )}
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
                createDownload.isPending &&
                activeAttachmentId === attachment.id;
              const status = statusDetails[attachment.status];

              return (
                <article key={attachment.id} className={styles.evidenceRow}>
                  <div className={styles.evidenceIdentity}>
                    <span className={styles.evidenceFileIcon}>
                      <EvidenceIcon mediaType={attachment.media_type} />
                    </span>
                    <div>
                      <strong title={attachment.filename}>
                        {attachment.filename}
                      </strong>
                      <span>
                        {mediaTypeLabel(attachment.media_type)} ·{" "}
                        {formatBytes(attachment.size_bytes)}
                      </span>
                    </div>
                    <Badge size="xs" variant="light" color={status.color}>
                      {status.label}
                    </Badge>
                  </div>

                  <dl className={styles.evidenceMetaGrid}>
                    <div>
                      <dt>UPLOADER</dt>
                      <dd>
                        {uploader?.display_name ??
                          uploader?.email ??
                          "Workspace member"}
                      </dd>
                    </div>
                    <div>
                      <dt>UPLOADED</dt>
                      <dd>{formatDateTime(attachment.created_at)}</dd>
                    </div>
                  </dl>

                  <div className={styles.evidenceReasoningLink}>
                    <IconLink size={13} />
                    <span>Linked to</span>
                    <strong>
                      {proposal
                        ? `Proposal · ${proposal.title}`
                        : "Decision context"}
                    </strong>
                  </div>

                  {attachment.status !== "available" && (
                    <UploadStateTrack status={attachment.status} />
                  )}

                  {(attachment.status === "pending" ||
                    attachment.status === "processing") && (
                    <div className={styles.evidenceProcessing} role="status">
                      <Loader size={12} color="orange" />
                      {attachment.status === "pending"
                        ? "Preparing the stored file for processing"
                        : "Checking integrity and preparing a secure preview"}
                    </div>
                  )}

                  {attachment.status === "rejected" && (
                    <Alert color="red" title="Evidence processing failed">
                      {attachment.processing_error ||
                        "ForkRoom could not verify this stored file."}
                    </Alert>
                  )}

                  <Group gap="xs" className={styles.evidenceActions}>
                    {attachment.status === "available" &&
                      isEvidencePreviewable(attachment.media_type) && (
                        <Button
                          size="compact-xs"
                          variant="default"
                          leftSection={<IconEye size={14} />}
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
                        onClick={() => openUpload(attachment)}
                      >
                        Retry
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
              Request the file again. Download links are intentionally
              short-lived.
            </Alert>
          )}
        </>
      )}

      <AttachmentUploadModal
        workspaceId={workspaceId}
        decisionId={decisionId}
        proposals={proposals}
        retryAttachment={retryAttachment}
        opened={uploadOpened}
        onClose={() => {
          setUploadOpened(false);
          setRetryAttachment(null);
        }}
      />
    </div>
  );
}