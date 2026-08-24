"use client";

import { useEffect, useState } from "react";
import { Button, Group, Image, Loader } from "@mantine/core";
import {
  IconArrowLeft,
  IconDownload,
  IconExternalLink,
  IconFileOff,
  IconRefresh,
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewAttempt, setPreviewAttempt] = useState(0);

  useEffect(() => {
    if (!isImage && !isPdf) return;

    const controller = new AbortController();
    let localUrl: string | null = null;

    const loadPreview = async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setPreviewUrl(null);
      setPreviewError(null);

      try {
        const response = await fetch(item.url, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Preview request failed with ${response.status}.`);
        }

        const bytes = await response.arrayBuffer();
        const blob = new Blob([bytes], { type: item.mediaType });
        localUrl = URL.createObjectURL(blob);
        setPreviewUrl(localUrl);
      } catch (error) {
        if (controller.signal.aborted) return;
        setPreviewError(
          error instanceof Error
            ? error.message
            : "The browser could not prepare this preview.",
        );
      }
    };

    void loadPreview();

    return () => {
      controller.abort();
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [isImage, isPdf, item.mediaType, item.url, previewAttempt]);

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
        {(isImage || isPdf) && !previewUrl && !previewError && (
          <div className={styles.evidencePreviewLoading} role="status">
            <Loader color="rust" size="sm" />
            <strong>Preparing preview</strong>
            <span>The file will remain inside the Decision Room.</span>
          </div>
        )}

        {isImage && previewUrl && (
          <Image
            src={previewUrl}
            alt={`Preview of ${item.filename}`}
            className={styles.evidencePreviewImage}
            fit="contain"
          />
        )}

        {isPdf && previewUrl && (
          <iframe
            src={previewUrl}
            title={`Preview of ${item.filename}`}
            className={styles.evidencePreviewFrame}
          />
        )}

        {(isImage || isPdf) && previewError && (
          <div className={styles.evidencePreviewUnavailable} role="alert">
            <IconFileOff size={24} />
            <strong>Preview could not be prepared</strong>
            <span>
              The secure link may have expired, or storage may be blocking the
              browser from reading this file. Retry before downloading it.
            </span>
            <Button
              size="compact-sm"
              variant="default"
              leftSection={<IconRefresh size={14} />}
              onClick={() => setPreviewAttempt((attempt) => attempt + 1)}
            >
              Retry preview
            </Button>
          </div>
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
          href={previewUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          leftSection={<IconExternalLink size={14} />}
          disabled={!previewUrl}
        >
          Open full size
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
