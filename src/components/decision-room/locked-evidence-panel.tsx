"use client";

import { useMemo, useState } from "react";
import { Alert, Badge, Button, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDownload,
  IconFileCheck,
  IconLock,
  IconPaperclip,
} from "@tabler/icons-react";

import { useAttachmentDownload } from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import type {
  DecisionLock,
  Proposal,
  WorkspaceMember,
} from "@/services/workspace.service";

import styles from "./decision-room.module.css";

export type SnapshotEvidence = {
  id: string;
  filename: string;
  mediaType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  proposalId: string | null;
  uploadedById: string | null;
  createdAt: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringOrNull = (value: unknown) =>
  typeof value === "string" ? value : null;

const numberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function getSnapshotEvidence(
  snapshot: DecisionLock["snapshot"],
): SnapshotEvidence[] {
  const value = snapshot.attachments;
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    const id = stringOrNull(item.id);
    const filename = stringOrNull(item.filename);
    if (!id || !filename) return [];

    return [
      {
        id,
        filename,
        mediaType: stringOrNull(item.media_type),
        sizeBytes: numberOrNull(item.size_bytes),
        sha256: stringOrNull(item.sha256),
        proposalId: stringOrNull(item.proposal_id),
        uploadedById: stringOrNull(item.uploaded_by_id),
        createdAt: stringOrNull(item.created_at),
      },
    ];
  });
}

const formatBytes = (value: number | null) => {
  if (value === null) return "Size not exposed";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Timestamp not exposed";

type LockedEvidencePanelProps = {
  workspaceId: string;
  decisionLock: DecisionLock;
  proposals: Proposal[];
  members: WorkspaceMember[];
  compact?: boolean;
};

export function LockedEvidencePanel({
  workspaceId,
  decisionLock,
  proposals,
  members,
  compact = false,
}: LockedEvidencePanelProps) {
  const download = useAttachmentDownload(workspaceId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const evidence = getSnapshotEvidence(decisionLock.snapshot);
  const proposalById = useMemo(
    () => new Map(proposals.map((proposal) => [proposal.id, proposal])),
    [proposals],
  );
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member])),
    [members],
  );

  const openDownload = async (item: SnapshotEvidence) => {
    setActiveId(item.id);

    try {
      const result = await download.mutateAsync(item.id);
      const link = document.createElement("a");
      link.href = result.download_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Could not open preserved evidence",
        message: getApiErrorMessage(
          error,
          "ForkRoom could not create a fresh authorized download link.",
        ),
      });
    } finally {
      setActiveId(null);
    }
  };

  return (
    <section
      className={`${styles.lockedEvidencePanel} ${
        compact ? styles.lockedEvidencePanelCompact : ""
      }`}
    >
      <div className={styles.lockedEvidenceHeading}>
        <div>
          <span className={styles.kicker}>LOCKED EVIDENCE</span>
          <h2>Files included in snapshot v{decisionLock.snapshot_version}</h2>
        </div>
        <Badge
          color="dark"
          variant="light"
          leftSection={<IconLock size={12} />}
        >
          Immutable
        </Badge>
      </div>

      <p className={styles.lockedEvidenceCopy}>
        These records come from the preserved snapshot, not the current
        workspace attachment list. Their metadata is covered by the decision
        SHA-256 hash.
      </p>

      {evidence.length === 0 ? (
        <div className={styles.evidenceEmpty}>
          <IconPaperclip size={24} />
          <strong>No attachment metadata exposed</strong>
          <span>
            This lock snapshot does not return an attachments collection.
            ForkRoom will not infer evidence from the mutable workspace list.
          </span>
        </div>
      ) : (
        <div className={styles.lockedEvidenceList}>
          {evidence.map((item) => {
            const proposal = item.proposalId
              ? proposalById.get(item.proposalId)
              : null;
            const uploader = item.uploadedById
              ? memberById.get(item.uploadedById)
              : null;

            return (
              <article key={item.id} className={styles.lockedEvidenceCard}>
                <div className={styles.evidenceIdentity}>
                  <span className={styles.evidenceFileIcon}>
                    <IconFileCheck size={18} />
                  </span>
                  <div>
                    <strong title={item.filename}>{item.filename}</strong>
                    <span>
                      {formatBytes(item.sizeBytes)} ·{" "}
                      {proposal?.title ?? "Decision context"}
                    </span>
                  </div>
                  <Badge size="xs" color="green" variant="light">
                    Included
                  </Badge>
                </div>

                <div className={styles.evidenceMeta}>
                  <span>
                    Uploaded by{" "}
                    {uploader?.display_name ??
                      uploader?.email ??
                      "Actor not exposed"}
                  </span>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>

                {item.sha256 && (
                  <code className={styles.evidenceHash} title={item.sha256}>
                    FILE SHA-256 {item.sha256}
                  </code>
                )}

                <Group justify="flex-end">
                  <Button
                    size="compact-xs"
                    variant="default"
                    leftSection={<IconDownload size={14} />}
                    onClick={() => openDownload(item)}
                    loading={download.isPending && activeId === item.id}
                  >
                    Secure download
                  </Button>
                </Group>
              </article>
            );
          })}
        </div>
      )}

      {download.error && (
        <Alert color="red" title="Download link unavailable">
          The snapshot remains valid even if its stored file cannot currently be
          downloaded. Retry to request a fresh short-lived link.
        </Alert>
      )}
    </section>
  );
}
