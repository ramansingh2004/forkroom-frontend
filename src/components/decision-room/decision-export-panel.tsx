'use client';

import { Alert, Badge, Button, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconDownload,
  IconFileTypePdf,
  IconRefresh,
} from '@tabler/icons-react';

import {
  useDecisionExport,
  useDecisionExportDownload,
  useRequestDecisionExport,
} from '@/hooks/use-workspaces';
import {
  getApiErrorMessage,
  getApiStatus,
} from '@/services/auth.service';
import type { DecisionExport } from '@/services/workspace.service';

import styles from './decision-room.module.css';

type DecisionExportPanelProps = {
  workspaceId: string;
  decisionId: string;
  documentHash: string;
  verificationPending: boolean;
  verificationValid: boolean;
  canRequestExport: boolean;
};

const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Not recorded';

const formatBytes = (value: number | null) => {
  if (value === null) return 'Not available';
  if (value < 1_024) return `${value} B`;
  if (value < 1_048_576) return `${(value / 1_024).toFixed(1)} KB`;
  return `${(value / 1_048_576).toFixed(1)} MB`;
};

const statusColor = (status: DecisionExport['status']) => {
  if (status === 'available') return 'green';
  if (status === 'failed') return 'red';
  if (status === 'processing') return 'blue';
  return 'orange';
};

export function DecisionExportPanel({
  workspaceId,
  decisionId,
  documentHash,
  verificationPending,
  verificationValid,
  canRequestExport,
}: DecisionExportPanelProps) {
  const decisionExport = useDecisionExport(workspaceId, decisionId);
  const requestExport = useRequestDecisionExport(workspaceId, decisionId);
  const downloadExport = useDecisionExportDownload(workspaceId, decisionId);
  const exportNotFound =
    decisionExport.isError && getApiStatus(decisionExport.error) === 404;
  const exportRecord = decisionExport.data;
  const hashMatches = exportRecord?.document_hash === documentHash;
  const exportActionDisabled = verificationPending || !verificationValid;

  const requestOrRetry = async () => {
    try {
      const requested = await requestExport.mutateAsync();

      notifications.show({
        color: requested.status === 'available' ? 'green' : 'blue',
        title:
          requested.status === 'available'
            ? 'PDF export available'
            : 'PDF export requested',
        message:
          requested.status === 'available'
            ? 'ForkRoom found the existing export for this locked snapshot.'
            : 'Rendering continues in the background. You can leave this page safely.',
      });
    } catch {
      // The mutation error is rendered below the export state.
    }
  };

  const download = async () => {
    try {
      const response = await downloadExport.mutateAsync();
      const link = document.createElement('a');
      link.href = response.download_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();

      notifications.show({
        color: 'green',
        title: 'Secure download opened',
        message: `The temporary link expires ${formatDateTime(response.expires_at)}.`,
      });
    } catch {
      // The mutation error is rendered below the export state.
    }
  };

  return (
    <section className={styles.exportSection} aria-labelledby="decision-export-heading">
      <div className={styles.exportHeading}>
        <div>
          <div className={styles.sectionIndex}>03 / PDF EXPORT</div>
          <h2 id="decision-export-heading">Portable decision record</h2>
          <p>
            Generate one content-addressed PDF from this immutable snapshot.
            Export work continues after navigation and repeated requests reuse
            the same locked record.
          </p>
        </div>

        <Button
          variant="default"
          size="xs"
          leftSection={<IconRefresh size={14} />}
          onClick={() => decisionExport.refetch()}
          loading={decisionExport.isFetching && !decisionExport.isPending}
        >
          Refresh status
        </Button>
      </div>

      <div className={styles.exportLiveRegion} aria-live="polite">
        {decisionExport.isPending && (
          <div className={styles.exportAsyncState}>
            <Loader color="rust" size="xs" /> Checking for an existing export…
          </div>
        )}

        {exportNotFound && (
          <div className={styles.exportEmpty}>
            <IconFileTypePdf size={30} />
            <strong>No PDF export yet</strong>
            <p>
              ForkRoom will preserve the winning proposal, decision context,
              voting result, objections, audit metadata, and snapshot hash.
            </p>

            {canRequestExport ? (
              <Button
                color="rust"
                leftSection={<IconFileTypePdf size={17} />}
                onClick={requestOrRetry}
                loading={requestExport.isPending}
                disabled={exportActionDisabled}
              >
                Generate PDF
              </Button>
            ) : (
              <Alert color="gray" title="Request permission required">
                Viewers can download an available export, but a workspace
                contributor must request the first PDF.
              </Alert>
            )}
          </div>
        )}

        {decisionExport.isError && !exportNotFound && (
          <Alert color="red" title="Export status could not be loaded">
            {getApiErrorMessage(
              decisionExport.error,
              'ForkRoom could not load the PDF export state.',
            )}
          </Alert>
        )}

        {exportRecord && (
          <div className={styles.exportRecord}>
            <div className={styles.exportStatusCard}>
              <div className={styles.exportStatusIcon}>
                {exportRecord.status === 'available' ? (
                  <IconCircleCheck size={22} />
                ) : exportRecord.status === 'failed' ? (
                  <IconAlertTriangle size={22} />
                ) : (
                  <Loader color="rust" size="sm" />
                )}
              </div>

              <div>
                <Badge
                  color={statusColor(exportRecord.status)}
                  variant="light"
                  size="sm"
                >
                  {exportRecord.status}
                </Badge>
                <strong>
                  {exportRecord.status === 'pending'
                    ? 'Export queued'
                    : exportRecord.status === 'processing'
                      ? 'Rendering the locked decision'
                      : exportRecord.status === 'available'
                        ? 'PDF ready to download'
                        : 'PDF rendering failed'}
                </strong>
                <p>
                  {exportRecord.status === 'pending'
                    ? 'The worker will claim this export when capacity is available.'
                    : exportRecord.status === 'processing'
                      ? 'ForkRoom is verifying the snapshot and rendering the PDF in the background.'
                      : exportRecord.status === 'available'
                        ? 'A fresh short-lived link is created only when you choose Download.'
                        : exportRecord.error ||
                          'The locked decision is safe. Retry only restarts PDF generation.'}
                </p>
              </div>
            </div>

            <div className={styles.exportMetadata}>
              <div>
                <span>FILE</span>
                <strong>{exportRecord.filename}</strong>
              </div>
              <div>
                <span>CREATED</span>
                <strong>{formatDateTime(exportRecord.created_at)}</strong>
              </div>
              <div>
                <span>ATTEMPTS</span>
                <strong>{exportRecord.attempt_count}</strong>
              </div>
              <div>
                <span>SIZE</span>
                <strong>{formatBytes(exportRecord.size_bytes)}</strong>
              </div>
              <div>
                <span>STARTED</span>
                <strong>{formatDateTime(exportRecord.started_at)}</strong>
              </div>
              <div>
                <span>COMPLETED</span>
                <strong>{formatDateTime(exportRecord.completed_at)}</strong>
              </div>
            </div>

            <div className={styles.hashRecord}>
              <span>EXPORT DOCUMENT HASH</span>
              <code>{exportRecord.document_hash}</code>
            </div>

            {!hashMatches && (
              <Alert
                color="red"
                icon={<IconAlertTriangle size={18} />}
                title="Export does not match this locked snapshot"
              >
                Download is disabled because the export hash and authoritative
                lock hash differ. Refresh the state and investigate before
                relying on this PDF.
              </Alert>
            )}

            {exportRecord.status === 'available' && (
              <div className={styles.exportActions}>
                <Button
                  color="dark"
                  leftSection={<IconDownload size={17} />}
                  onClick={download}
                  loading={downloadExport.isPending}
                  disabled={!hashMatches || exportActionDisabled}
                >
                  Download PDF
                </Button>
                <span>
                  Download URLs are short-lived. ForkRoom creates a new link
                  every time this action is used.
                </span>
              </div>
            )}

            {exportRecord.status === 'failed' && (
              <div className={styles.exportActions}>
                {canRequestExport ? (
                  <Button
                    color="rust"
                    leftSection={<IconRefresh size={16} />}
                    onClick={requestOrRetry}
                    loading={requestExport.isPending}
                    disabled={exportActionDisabled}
                  >
                    Retry export
                  </Button>
                ) : (
                  <span>
                    A workspace contributor must retry this failed export.
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!verificationPending && !verificationValid && (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          title="Verify the lock before exporting"
        >
          Export requests and downloads remain disabled until the current
          snapshot produces the recorded SHA-256 hash.
        </Alert>
      )}

      {requestExport.error && (
        <Alert color="red" title="PDF export could not be requested">
          {getApiErrorMessage(
            requestExport.error,
            'ForkRoom could not queue this locked decision for PDF rendering.',
          )}
        </Alert>
      )}

      {downloadExport.error && (
        <Alert color="red" title="Download link could not be created">
          {getApiErrorMessage(
            downloadExport.error,
            'The previous link may have expired. Request a fresh download link and try again.',
          )}
        </Alert>
      )}
    </section>
  );
}
