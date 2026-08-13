"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Badge, Button, Skeleton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconActivity,
  IconArrowUpRight,
  IconAt,
  IconDownload,
  IconEye,
  IconFileText,
  IconRefresh,
} from "@tabler/icons-react";

import { EvidencePreview, isEvidencePreviewable, type EvidencePreviewItem } from "@/components/decision-room/evidence-preview";
import { IntegrationsPage } from "@/components/integrations/integrations-page";
import { useNotifications } from "@/hooks/use-notifications";
import {
  useAttachmentDownload,
  useWorkspaceAttachments,
  useWorkspaceDecisions,
  useWorkspaceMembers,
} from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import type { Attachment } from "@/services/workspace.service";

import styles from "./workspace-utility.module.css";

export type WorkspaceUtilityKind =
  | "documents"
  | "activity"
  | "mentions"
  | "integrations";

type Props = {
  workspaceId: string;
  kind: WorkspaceUtilityKind;
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

const pageCopy: Record<WorkspaceUtilityKind, { eyebrow: string; title: string; description: string }> = {
  documents: {
    eyebrow: "WORKSPACE / EVIDENCE",
    title: "Documents",
    description: "Review evidence files in their decision context rather than as an unrelated file drive.",
  },
  activity: {
    eyebrow: "WORKSPACE / HISTORY",
    title: "Recent activity",
    description: "Follow decision, evidence, and attention events for this workspace in time order.",
  },
  mentions: {
    eyebrow: "WORKSPACE / CONVERSATION",
    title: "Mentions",
    description: "Find comments where a workspace member explicitly requested your attention.",
  },
  integrations: {
    eyebrow: "WORKSPACE / SYSTEM",
    title: "Integrations",
    description: "Connect external systems without mixing configuration into daily decision work.",
  },
};

export function WorkspaceUtilityPage({ workspaceId, kind }: Props) {
  const copy = pageCopy[kind];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span>{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </header>

      {kind === "documents" && <DocumentsView workspaceId={workspaceId} />}
      {kind === "activity" && <ActivityView workspaceId={workspaceId} />}
      {kind === "mentions" && <MentionsView />}
      {kind === "integrations" && <IntegrationsPage workspaceId={workspaceId} />}
    </div>
  );
}

function DocumentsView({ workspaceId }: { workspaceId: string }) {
  const attachments = useWorkspaceAttachments(workspaceId);
  const decisions = useWorkspaceDecisions(workspaceId);
  const members = useWorkspaceMembers(workspaceId);
  const download = useAttachmentDownload(workspaceId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<EvidencePreviewItem | null>(null);
  const decisionById = useMemo(
    () => new Map((decisions.data ?? []).map((decision) => [decision.id, decision])),
    [decisions.data],
  );
  const memberById = useMemo(
    () => new Map((members.data ?? []).map((member) => [member.user_id, member])),
    [members.data],
  );

  const openAttachment = async (attachment: Attachment, mode: "preview" | "download") => {
    setActiveId(attachment.id);
    try {
      const result = await download.mutateAsync(attachment.id);
      if (mode === "preview" && isEvidencePreviewable(attachment.media_type)) {
        const uploader = memberById.get(attachment.uploaded_by_id);
        const decision = attachment.decision_id
          ? decisionById.get(attachment.decision_id)
          : null;
        setPreview({
          filename: attachment.filename,
          mediaType: attachment.media_type,
          sizeLabel: formatBytes(attachment.size_bytes),
          uploaderLabel: uploader?.display_name ?? uploader?.email ?? "Workspace member",
          uploadedAt: attachment.created_at,
          reasoningLabel: decision ? `Decision · ${decision.title}` : "Workspace evidence",
          url: result.download_url,
          expiresAt: result.expires_at,
        });
        return;
      }
      const link = document.createElement("a");
      link.href = result.download_url;
      link.click();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Could not open document",
        message: getApiErrorMessage(error, "ForkRoom could not create a fresh authorized file link."),
      });
    } finally {
      setActiveId(null);
    }
  };

  if (preview) return <EvidencePreview item={preview} onBack={() => setPreview(null)} />;
  if (attachments.isPending || decisions.isPending || members.isPending) return <UtilitySkeleton />;
  if (attachments.isError) {
    return <UtilityError title="Documents are unavailable" error={attachments.error} onRetry={() => void attachments.refetch()} />;
  }

  const items = (attachments.data ?? []).filter((item) => item.status !== "deleted");
  if (items.length === 0) {
    return <EmptyState icon={IconFileText} title="No evidence documents yet" description="Files added from a Decision Room will appear here with their decision and proposal context." />;
  }

  return (
    <section className={styles.panel} aria-label="Workspace documents">
      <div className={styles.tableHeader}>
        <span>File</span><span>Decision context</span><span>Uploaded</span><span>Status</span><span />
      </div>
      {items.map((attachment) => {
        const decision = attachment.decision_id ? decisionById.get(attachment.decision_id) : null;
        const busy = download.isPending && activeId === attachment.id;
        return (
          <article className={styles.documentRow} key={attachment.id}>
            <div><strong>{attachment.filename}</strong><span>{attachment.media_type} · {formatBytes(attachment.size_bytes)}</span></div>
            <div>{decision ? <Link href={`/w/${workspaceId}/decisions/${decision.id}`}>{decision.title}</Link> : <span>Workspace evidence</span>}</div>
            <time dateTime={attachment.created_at}>{formatDateTime(attachment.created_at)}</time>
            <Badge variant="light" color={attachment.status === "rejected" ? "red" : attachment.status === "available" ? "green" : "orange"}>{attachment.status}</Badge>
            <div className={styles.rowActions}>
              {attachment.status === "available" && isEvidencePreviewable(attachment.media_type) && <Button size="compact-sm" variant="default" leftSection={<IconEye size={15} />} loading={busy} onClick={() => void openAttachment(attachment, "preview")}>Preview</Button>}
              {attachment.status === "available" && <Button size="compact-sm" variant="subtle" color="dark" leftSection={<IconDownload size={15} />} loading={busy} onClick={() => void openAttachment(attachment, "download")}>Download</Button>}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function ActivityView({ workspaceId }: { workspaceId: string }) {
  const decisions = useWorkspaceDecisions(workspaceId);
  const attachments = useWorkspaceAttachments(workspaceId);
  const notificationFeed = useNotifications({ limit: 100, offset: 0 });
  if (decisions.isPending || attachments.isPending || notificationFeed.isPending) return <UtilitySkeleton />;
  if (decisions.isError || attachments.isError || notificationFeed.isError) {
    const error = decisions.error ?? attachments.error ?? notificationFeed.error;
    return <UtilityError title="Recent activity is unavailable" error={error} onRetry={() => void Promise.all([decisions.refetch(), attachments.refetch(), notificationFeed.refetch()])} />;
  }

  const events = [
    ...(decisions.data ?? []).map((decision) => ({ id: `decision-${decision.id}`, at: decision.updated_at, title: decision.title, detail: `Decision is ${decision.status}.`, href: `/w/${workspaceId}/decisions/${decision.id}`, type: "Decision" })),
    ...(attachments.data ?? []).filter((item) => item.status !== "deleted").map((item) => ({ id: `attachment-${item.id}`, at: item.updated_at, title: item.filename, detail: `Evidence is ${item.status}.`, href: item.decision_id ? `/w/${workspaceId}/decisions/${item.decision_id}` : `/w/${workspaceId}/documents`, type: "Evidence" })),
    ...(notificationFeed.data?.items ?? []).filter((item) => item.workspace_id === workspaceId).map((item) => ({ id: `notification-${item.id}`, at: item.created_at, title: item.title, detail: item.body, href: "/notifications", type: "Attention" })),
  ].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());

  if (events.length === 0) return <EmptyState icon={IconActivity} title="No workspace activity yet" description="Decision changes, evidence processing, and attention events will appear here." />;
  return <section className={styles.timeline}>{events.map((event) => <article key={event.id} className={styles.activityRow}><span className={styles.activityMark} /><div><Badge size="sm" variant="light" color="gray">{event.type}</Badge><strong>{event.title}</strong><p>{event.detail}</p></div><time dateTime={event.at}>{formatDateTime(event.at)}</time><Button component={Link} href={event.href} size="compact-sm" variant="subtle" color="dark" rightSection={<IconArrowUpRight size={14} />}>Open</Button></article>)}</section>;
}

function MentionsView() {
  return <CapabilityState icon={IconAt} title="Mentions are ready for a backend feed" description="This page is now reachable from every workspace. The current API does not expose comment mentions or a mention-specific notification kind, so ForkRoom will not fabricate results. When the backend adds mention events, they can populate this surface without changing navigation." />;
}

function UtilitySkeleton() {
  return <div className={styles.skeleton} aria-label="Loading page"><Skeleton height={72} /><Skeleton height={72} /><Skeleton height={72} /></div>;
}

function UtilityError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return <Alert color="red" title={title}>{getApiErrorMessage(error, "ForkRoom could not load this workspace surface.")}<Button mt="sm" size="compact-sm" variant="default" leftSection={<IconRefresh size={15} />} onClick={onRetry}>Retry</Button></Alert>;
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof IconFileText; title: string; description: string }) {
  return <section className={styles.state}><Icon size={30} /><strong>{title}</strong><p>{description}</p></section>;
}

function CapabilityState({ icon: Icon, title, description }: { icon: typeof IconFileText; title: string; description: string }) {
  return <section className={styles.capability}><Icon size={28} /><div><span>AVAILABLE DESTINATION</span><h2>{title}</h2><p>{description}</p></div></section>;
}
