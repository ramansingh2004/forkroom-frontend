"use client";

import { Button, Group, Image } from "@mantine/core";
import {
  IconArrowLeft,
  IconDownload,
  IconExternalLink,
  IconFileOff,
} from "@tabler/icons-react";

import styles from "./decision-room.module.css";

export type EvidencePreviewItem = {
  filename: string;
  mediaType: string;
  sizeLabel: string;
  uploaderLabel: string;
  uploadedAt: string | null;
  reasoningLabel: string;
  url: string;
  expiresAt: string;
};

const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Timestamp not exposed";

export const isEvidencePreviewable = (mediaType: string | null) =>
  Boolean(
    mediaType &&
      (mediaType.startsWith("image/") || mediaType === "application/pdf"),
  );

export function EvidencePreview({
  item,
  onBack,
}: {
  item: EvidencePreviewItem;
  onBack: () => void;
}) {
  const isImage = item.mediaType.startsWith("image/");
  const isPdf = item.mediaType === "application/pdf";

  return (
    <section
      className={styles.evidencePreviewSurface}
      aria-label="Evidence preview"
    >
      <div className={styles.evidencePreviewHeader}>
        <Button
          size="compact-xs"
          variant="subtle"
          color="dark"
          leftSection={<IconArrowLeft size={14} />}
          onClick={onBack}
        >
          Evidence
        </Button>
        <span>IN-ROOM PREVIEW</span>
      </div>

      <div className={styles.evidencePreviewTitle}>
        <strong title={item.filename}>{item.filename}</strong>
        <span>
          {item.sizeLabel} · {item.mediaType}
        </span>
      </div>

      <dl className={styles.evidencePreviewMeta}>
        <div>
          <dt>UPLOADER</dt>
          <dd>{item.uploaderLabel}</dd>
        </div>
        <div>
          <dt>UPLOADED</dt>
          <dd>{formatDateTime(item.uploadedAt)}</dd>
        </div>
        <div>
          <dt>LINKED TO</dt>
          <dd>{item.reasoningLabel}</dd>
        </div>
      </dl>

      <div className={styles.evidencePreviewViewport}>
        {isImage && (
          <Image
            src={item.url}
            alt={`Preview of ${item.filename}`}
            className={styles.evidencePreviewImage}
            fit="contain"
          />
        )}

        {isPdf && (
          <iframe
            src={item.url}
            title={`Preview of ${item.filename}`}
            className={styles.evidencePreviewFrame}
          />
        )}

        {!isImage && !isPdf && (
          <div className={styles.evidencePreviewUnavailable}>
            <IconFileOff size={24} />
            <strong>Inline preview unavailable</strong>
            <span>Download this file to inspect its contents.</span>
          </div>
        )}
      </div>

      <div className={styles.previewExpiry}>
        Secure preview expires {formatDateTime(item.expiresAt)}
      </div>

      <Group grow gap="xs" className={styles.previewFooter}>
        <Button
          component="a"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          leftSection={<IconExternalLink size={14} />}
        >
          Open
        </Button>
        <Button
          component="a"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          variant="light"
          color="rust"
          leftSection={<IconDownload size={14} />}
        >
          Download
        </Button>
      </Group>
    </section>
  );
}