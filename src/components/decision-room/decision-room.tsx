"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Loader,
  Menu,
  ScrollArea,
  Tabs,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowBackUp,
  IconAlertTriangle,
  IconAdjustmentsHorizontal,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconCheck,
  IconCircleOff,
  IconChevronRight,
  IconDotsVertical,
  IconEdit,
  IconFileExport,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
  IconLock,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlus,
  IconMessageExclamation,
  IconRestore,
  IconScale,
  IconSend,
  IconTrash,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  useGroupRef,
  usePanelRef,
} from "react-resizable-panels";

import { useCurrentUser } from "@/hooks/use-auth";
import {
  useDeleteProposal,
  useDecision,
  useDecisionAttachments,
  useDecisionCriteria,
  useDecisionLock,
  useDecisionProposals,
  useOpenBlockingObjections,
  useProposalObjections,
  useTransitionDecision,
  useTransitionProposal,
  useWorkspace,
  useWorkspaceMembers,
  useVotingSessions,
  useVotingResult,
} from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import {
  DecisionRoomSkeleton,
  RecoveryState,
} from "@/components/feedback/app-feedback";
import type {
  Criterion,
  DecisionLock,
  DecisionStatus,
  Objection,
  ObjectionStatus,
  Proposal,
  VotingSession,
  WorkspaceMember,
} from "@/services/workspace.service";
import { useUiStore } from "@/stores/use-ui-store";

import styles from "./decision-room.module.css";
import {
  DecisionLifecycleIndicator,
  type DecisionLifecycleStage,
  type VotingReadiness,
} from "./decision-lifecycle";
import { ObjectionEditorModal } from "./objection-editor-modal";
import { ObjectionStatusModal } from "./objection-status-modal";
import { LockedDecisionPanel } from "./locked-decision-panel";
import { EvidencePanel } from "./evidence-panel";
import {
  getSnapshotEvidence,
  LockedEvidencePanel,
} from "./locked-evidence-panel";
import { ProposalEditorModal } from "./proposal-editor-modal";
import {
  type VotingPanelAction,
  type VotingPanelActionRequest,
  VotingPanel,
} from "./voting-panel";
import { MeetingDock } from "./meeting-room/meeting-dock";
import { DiscussionPanel } from "./discussion-panel";

type WorkMode = "document" | "proposal" | "compare" | "vote";
type CollaborationTab = "discussion" | "evidence" | "people";
type FocusPanel = "outline" | "document" | "collaboration";

const DECISION_ROOM_LAYOUT_STORAGE_KEY =
  "react-resizable-panels:forkroom-decision-room:outline:document:collaboration";

function ProposalObjectionCount({
  workspaceId,
  decisionId,
  proposalId,
}: {
  workspaceId: string;
  decisionId: string;
  proposalId: string;
}) {
  const objections = useProposalObjections(
    workspaceId,
    decisionId,
    proposalId,
    {
      status: "open",
    },
  );

  if (!objections.data?.length) return null;

  return (
    <span className={styles.proposalObjectionCount}>
      <IconMessageExclamation size={11} />
      {objections.data.length} open
    </span>
  );
}

function OutlinePanel({
  workspaceId,
  decisionId,
  proposals,
  criteriaCount,
  evidenceCount,
  selectedProposalId,
  canEdit,
  transitionPending,
  onSelectProposal,
  onCreateProposal,
  onEditProposal,
  onTransitionProposal,
  onDeleteProposal,
  onOpenEvidence,
  onEnterFocus,
}: {
  workspaceId: string;
  decisionId: string;
  proposals: Proposal[];
  criteriaCount: number;
  evidenceCount: number;
  selectedProposalId: string | null;
  canEdit: boolean;
  transitionPending: boolean;
  onSelectProposal: (proposal: Proposal) => void;
  onCreateProposal: () => void;
  onEditProposal: (proposal: Proposal) => void;
  onTransitionProposal: (
    proposal: Proposal,
    status: Proposal["status"],
  ) => void;
  onDeleteProposal: (proposal: Proposal) => void;
  onOpenEvidence: () => void;
  onEnterFocus?: () => void;
}) {
  return (
    <section className={styles.panel} aria-label="Decision outline">
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.kicker}>OUTLINE</span>
          <h2>Decision context</h2>
        </div>
        <div className={styles.panelHeaderActions}>
          {onEnterFocus && (
            <Tooltip label="Focus on outline">
              <ActionIcon
                variant="subtle"
                color="dark"
                aria-label="Focus on decision outline"
                onClick={onEnterFocus}
              >
                <IconArrowsMaximize size={17} stroke={1.8} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip
            label={canEdit ? "Add proposal" : "This decision is read-only"}
          >
            <ActionIcon
              variant="subtle"
              color="dark"
              aria-label="Add proposal"
              onClick={onCreateProposal}
              disabled={!canEdit}
            >
              <IconPlus size={18} stroke={1.8} />
            </ActionIcon>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className={styles.panelScroll} type="auto">
        <nav className={styles.outlineNav} aria-label="Decision sections">
          <a href="#context" className={styles.outlineLinkActive}>
            Context
          </a>
          <a href="#criteria">
            Criteria <span>{criteriaCount}</span>
          </a>
          <a href="#proposals">
            Proposals <span>{proposals.length}</span>
          </a>
          <button type="button" onClick={onOpenEvidence}>
            Evidence <span>{evidenceCount}</span>
          </button>
        </nav>

        <div className={styles.sectionHeading}>
          <span>PROPOSALS</span>
          <span>{proposals.length}</span>
        </div>

        {proposals.length > 0 ? (
          <div className={styles.proposalList}>
            {proposals.map((proposal, index) => (
              <div key={proposal.id} className={styles.proposalItem}>
                <button
                  type="button"
                  className={`${styles.proposal} ${
                    proposal.id === selectedProposalId
                      ? styles.proposalSelected
                      : ""
                  }`}
                  onClick={() => onSelectProposal(proposal)}
                  aria-current={
                    proposal.id === selectedProposalId ? "true" : undefined
                  }
                >
                  <span className={styles.proposalNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong>{proposal.title}</strong>
                  <small>{proposal.summary || proposal.status}</small>
                  <span className={styles.proposalStatus}>
                    {proposal.status}
                  </span>
                  <ProposalObjectionCount
                    workspaceId={workspaceId}
                    decisionId={decisionId}
                    proposalId={proposal.id}
                  />
                </button>

                {canEdit && (
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        className={styles.proposalMenuButton}
                        variant="subtle"
                        color="dark"
                        size="sm"
                        aria-label={`Actions for ${proposal.title}`}
                      >
                        <IconDotsVertical size={15} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {proposal.status === "draft" && (
                        <>
                          <Menu.Item
                            leftSection={<IconEdit size={15} />}
                            onClick={() => onEditProposal(proposal)}
                          >
                            Edit proposal
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconSend size={15} />}
                            disabled={transitionPending}
                            onClick={() =>
                              onTransitionProposal(proposal, "submitted")
                            }
                          >
                            Submit proposal
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={15} />}
                            onClick={() => onDeleteProposal(proposal)}
                          >
                            Delete draft
                          </Menu.Item>
                        </>
                      )}

                      {proposal.status === "submitted" && (
                        <>
                          <Menu.Item
                            leftSection={<IconArrowBackUp size={15} />}
                            disabled={transitionPending}
                            onClick={() =>
                              onTransitionProposal(proposal, "draft")
                            }
                          >
                            Reopen as draft
                          </Menu.Item>
                          <Menu.Item
                            color="orange"
                            leftSection={<IconCircleOff size={15} />}
                            disabled={transitionPending}
                            onClick={() =>
                              onTransitionProposal(proposal, "withdrawn")
                            }
                          >
                            Withdraw proposal
                          </Menu.Item>
                        </>
                      )}

                      {proposal.status === "withdrawn" && (
                        <Menu.Item
                          leftSection={<IconArrowBackUp size={15} />}
                          disabled={transitionPending}
                          onClick={() =>
                            onTransitionProposal(proposal, "draft")
                          }
                        >
                          Reopen as draft
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptySection}>
            <strong>No proposals yet</strong>
            <p>
              Add an alternative that the team can compare, challenge, and vote
              on.
            </p>
            <Button
              size="xs"
              variant="light"
              color="rust"
              leftSection={<IconPlus size={14} />}
              onClick={onCreateProposal}
              disabled={!canEdit}
            >
              Add proposal
            </Button>
          </div>
        )}
      </ScrollArea>
    </section>
  );
}

function ProposalObjectionsSection({
  workspaceId,
  decisionId,
  proposal,
  canEdit,
}: {
  workspaceId: string;
  decisionId: string;
  proposal: Proposal;
  canEdit: boolean;
}) {
  const objections = useProposalObjections(
    workspaceId,
    decisionId,
    proposal.id,
  );
  const [editorObjection, setEditorObjection] = useState<
    Objection | null | undefined
  >(undefined);
  const [statusChange, setStatusChange] = useState<{
    objection: Objection;
    status: ObjectionStatus;
  } | null>(null);
  const canRaiseObjection = canEdit && proposal.status === "submitted";
  const orderedObjections = [...(objections.data ?? [])].sort((left, right) => {
    const statusOrder = { open: 0, resolved: 1, dismissed: 2 } as const;
    const severityOrder = { blocking: 0, major: 1, informational: 2 } as const;

    return (
      statusOrder[left.status] - statusOrder[right.status] ||
      severityOrder[left.severity] - severityOrder[right.severity]
    );
  });
  const openCount = orderedObjections.filter(
    (objection) => objection.status === "open",
  ).length;
  const openBlockingCount = orderedObjections.filter(
    (objection) =>
      objection.status === "open" && objection.severity === "blocking",
  ).length;

  const statusColor = (status: Objection["status"]) => {
    if (status === "resolved") return "green";
    if (status === "dismissed") return "orange";
    return "red";
  };

  const severityColor = (severity: Objection["severity"]) => {
    if (severity === "blocking") return "red";
    if (severity === "major") return "orange";
    return "blue";
  };

  return (
    <section
      className={styles.objectionsSection}
      aria-labelledby="proposal-objections-title"
    >
      <div className={styles.objectionsHeading}>
        <div>
          <div className={styles.sectionIndex}>02 / OBJECTIONS</div>
          <h2 id="proposal-objections-title">Challenges to this proposal</h2>
          <p>
            Open concerns stay visible here so they cannot be lost in general
            discussion.
          </p>
        </div>
        <Button
          size="xs"
          color="rust"
          leftSection={<IconMessageExclamation size={15} />}
          onClick={() => setEditorObjection(null)}
          disabled={!canRaiseObjection}
        >
          Raise objection
        </Button>
      </div>

      {!canRaiseObjection && proposal.status !== "submitted" && (
        <Alert
          color="gray"
          title="Submit this proposal before objections can be raised"
        >
          Objections belong to review-ready proposals. Existing objections
          remain visible.
        </Alert>
      )}

      {openBlockingCount > 0 && (
        <div className={styles.blockingNotice} role="status">
          <IconAlertTriangle size={18} />
          <div>
            <strong>
              {openBlockingCount} blocking objection
              {openBlockingCount === 1 ? "" : "s"} open
            </strong>
            <span>
              These concerns must be resolved or dismissed before commitment.
            </span>
          </div>
        </div>
      )}

      {objections.isPending && (
        <div className={styles.objectionState}>
          <Loader color="rust" size="xs" />
          <span>Loading objections…</span>
        </div>
      )}

      {objections.isError && (
        <Alert color="red" title="Could not load objections">
          {getApiErrorMessage(
            objections.error,
            "ForkRoom could not load the objections for this proposal.",
          )}
          <Button
            mt="sm"
            size="compact-sm"
            variant="default"
            onClick={() => void objections.refetch()}
          >
            Retry objections
          </Button>
        </Alert>
      )}

      {!objections.isPending &&
        !objections.isError &&
        orderedObjections.length === 0 && (
          <div className={styles.emptySection}>
            <strong>No objections have been raised</strong>
            <p>
              The proposal has no recorded concerns yet. Team members can add
              informational, major, or blocking objections after it is
              submitted.
            </p>
          </div>
        )}

      {orderedObjections.length > 0 && (
        <div className={styles.objectionList}>
          <div className={styles.objectionSummary}>
            <span>{openCount} open</span>
            <span>{orderedObjections.length} total</span>
          </div>

          {orderedObjections.map((objection) => (
            <article
              key={objection.id}
              className={`${styles.objectionCard} ${
                objection.status !== "open" ? styles.objectionCardClosed : ""
              }`}
            >
              <div className={styles.objectionCardHeader}>
                <div className={styles.objectionBadges}>
                  <Badge
                    variant="light"
                    color={severityColor(objection.severity)}
                    size="sm"
                  >
                    {objection.severity}
                  </Badge>
                  <Badge
                    variant="outline"
                    color={statusColor(objection.status)}
                    size="sm"
                  >
                    {objection.status}
                  </Badge>
                </div>

                {canEdit && (
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        color="dark"
                        aria-label={`Actions for ${objection.title}`}
                      >
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {objection.status === "open" ? (
                        <>
                          <Menu.Item
                            leftSection={<IconEdit size={15} />}
                            onClick={() => setEditorObjection(objection)}
                          >
                            Edit objection
                          </Menu.Item>
                          <Menu.Item
                            color="green"
                            leftSection={<IconCheck size={15} />}
                            onClick={() =>
                              setStatusChange({ objection, status: "resolved" })
                            }
                          >
                            Mark resolved
                          </Menu.Item>
                          <Menu.Item
                            color="orange"
                            leftSection={<IconCircleOff size={15} />}
                            onClick={() =>
                              setStatusChange({
                                objection,
                                status: "dismissed",
                              })
                            }
                          >
                            Dismiss with note
                          </Menu.Item>
                        </>
                      ) : (
                        <Menu.Item
                          leftSection={<IconRestore size={15} />}
                          onClick={() =>
                            setStatusChange({ objection, status: "open" })
                          }
                        >
                          Reopen objection
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                )}
              </div>

              <h3>{objection.title}</h3>
              <p>{objection.description}</p>

              {objection.resolution_note && (
                <div className={styles.resolutionNote}>
                  <strong>
                    {objection.status === "resolved"
                      ? "Resolution"
                      : "Dismissal note"}
                  </strong>
                  <span>{objection.resolution_note}</span>
                </div>
              )}

              <footer>
                Raised{" "}
                {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                  new Date(objection.created_at),
                )}
              </footer>
            </article>
          ))}
        </div>
      )}

      <ObjectionEditorModal
        workspaceId={workspaceId}
        decisionId={decisionId}
        proposalId={proposal.id}
        objection={editorObjection ?? null}
        opened={editorObjection !== undefined}
        onClose={() => setEditorObjection(undefined)}
        onSaved={(savedObjection) => {
          notifications.show({
            color: "green",
            title: editorObjection ? "Objection saved" : "Objection raised",
            message:
              savedObjection.severity === "blocking"
                ? "This blocking concern is now visible in the decision record."
                : "The concern is now visible on this proposal.",
          });
        }}
      />

      <ObjectionStatusModal
        workspaceId={workspaceId}
        decisionId={decisionId}
        proposalId={proposal.id}
        objection={statusChange?.objection ?? null}
        nextStatus={statusChange?.status ?? null}
        opened={Boolean(statusChange)}
        onClose={() => setStatusChange(null)}
        onTransitioned={(updatedObjection) => {
          notifications.show({
            color: updatedObjection.status === "resolved" ? "green" : "orange",
            title: "Objection updated",
            message:
              updatedObjection.status === "open"
                ? "The objection is open for review again."
                : `The objection was marked ${updatedObjection.status}.`,
          });
        }}
      />
    </section>
  );
}

function DocumentPanel({
  workspaceId,
  decisionId,
  title,
  summary,
  criteria,
  proposals,
  votingSessions,
  decisionStatus,
  decisionLock,
  members,
  currentUserId,
  isLocked,
  selectedProposal,
  mode,
  canEdit,
  canManageVoting,
  canRequestExport,
  canCreateActions,
  canManageFollowThrough,
  votingReadiness,
  votingActionRequest,
  transitionPending,
  onModeChange,
  onCreateProposal,
  onEditProposal,
  onTransitionProposal,
  onVotingActionHandled,
  onEnterFocus,
}: {
  workspaceId: string;
  decisionId: string;
  title: string;
  summary: string | null;
  criteria: Criterion[];
  proposals: Proposal[];
  votingSessions: VotingSession[];
  decisionStatus: DecisionStatus;
  decisionLock: DecisionLock | null;
  members: WorkspaceMember[];
  currentUserId: string;
  isLocked: boolean;
  selectedProposal: Proposal | null;
  mode: WorkMode;
  canEdit: boolean;
  canManageVoting: boolean;
  canRequestExport: boolean;
  canCreateActions: boolean;
  canManageFollowThrough: boolean;
  votingReadiness: VotingReadiness;
  votingActionRequest: VotingPanelActionRequest | null;
  transitionPending: boolean;
  onModeChange: (mode: WorkMode) => void;
  onCreateProposal: () => void;
  onEditProposal: (proposal: Proposal) => void;
  onTransitionProposal: (
    proposal: Proposal,
    status: Proposal["status"],
  ) => void;
  onVotingActionHandled: (requestId: number) => void;
  onEnterFocus?: () => void;
}) {
  return (
    <section
      className={`${styles.panel} ${styles.documentPanel}`}
      aria-label="Decision document"
    >
      <div className={styles.documentToolbar}>
        <Tabs
          value={isLocked ? "document" : mode}
          onChange={(value) => value && onModeChange(value as WorkMode)}
          variant="unstyled"
          classNames={{ list: styles.modeTabs, tab: styles.modeTab }}
        >
          <Tabs.List aria-label="Decision work mode">
            <Tabs.Tab value="document">
              {isLocked ? "Locked record" : "Document"}
            </Tabs.Tab>
            {!isLocked && (
              <>
                <Tabs.Tab value="proposal" disabled={!selectedProposal}>
                  Proposal
                </Tabs.Tab>
                <Tabs.Tab value="compare" disabled>
                  Compare
                </Tabs.Tab>
                <Tabs.Tab value="vote">Vote</Tabs.Tab>
              </>
            )}
          </Tabs.List>
        </Tabs>
        {onEnterFocus && (
          <Tooltip label="Focus on primary canvas">
            <ActionIcon
              variant="subtle"
              color="dark"
              aria-label="Focus on primary decision canvas"
              onClick={onEnterFocus}
            >
              <IconArrowsMaximize size={17} stroke={1.8} />
            </ActionIcon>
          </Tooltip>
        )}
      </div>

      <ScrollArea className={styles.documentScroll} type="auto">
        {isLocked && decisionLock ? (
          <LockedDecisionPanel
            workspaceId={workspaceId}
            decisionId={decisionId}
            title={title}
            summary={summary}
            decisionLock={decisionLock}
            proposals={proposals}
            members={members}
            currentUserId={currentUserId}
            canRequestExport={canRequestExport}
            canCreateActions={canCreateActions}
            canManageFollowThrough={canManageFollowThrough}
          />
        ) : mode === "vote" ? (
          <VotingPanel
            workspaceId={workspaceId}
            decisionId={decisionId}
            decisionStatus={decisionStatus}
            proposals={proposals}
            sessions={votingSessions}
            canManageVoting={canManageVoting}
            readiness={votingReadiness}
            actionRequest={votingActionRequest}
            onActionHandled={onVotingActionHandled}
          />
        ) : mode === "proposal" && selectedProposal ? (
          <article className={`${styles.document} ${styles.proposalDocument}`}>
            <div className={styles.proposalIdentity}>
              <div>
                <span className={styles.documentMeta}>PROPOSAL</span>
                <h1>{selectedProposal.title}</h1>
              </div>
              <Badge
                variant="light"
                color={
                  selectedProposal.status === "submitted"
                    ? "green"
                    : selectedProposal.status === "withdrawn"
                      ? "orange"
                      : "gray"
                }
              >
                {selectedProposal.status}
              </Badge>
            </div>

            <p className={styles.lede}>
              {selectedProposal.summary ||
                "No proposal summary has been added yet."}
            </p>

            <div className={styles.proposalEditorActions}>
              {canEdit && selectedProposal.status === "draft" && (
                <>
                  <Button
                    variant="default"
                    leftSection={<IconEdit size={16} />}
                    onClick={() => onEditProposal(selectedProposal)}
                  >
                    Edit
                  </Button>
                  <Button
                    color="rust"
                    leftSection={<IconSend size={16} />}
                    loading={transitionPending}
                    onClick={() =>
                      onTransitionProposal(selectedProposal, "submitted")
                    }
                  >
                    Submit proposal
                  </Button>
                </>
              )}

              {canEdit && selectedProposal.status === "submitted" && (
                <>
                  <Button
                    variant="default"
                    leftSection={<IconArrowBackUp size={16} />}
                    loading={transitionPending}
                    onClick={() =>
                      onTransitionProposal(selectedProposal, "draft")
                    }
                  >
                    Reopen
                  </Button>
                  <Button
                    variant="light"
                    color="orange"
                    leftSection={<IconCircleOff size={16} />}
                    loading={transitionPending}
                    onClick={() =>
                      onTransitionProposal(selectedProposal, "withdrawn")
                    }
                  >
                    Withdraw
                  </Button>
                </>
              )}

              {canEdit && selectedProposal.status === "withdrawn" && (
                <Button
                  variant="default"
                  leftSection={<IconArrowBackUp size={16} />}
                  loading={transitionPending}
                  onClick={() =>
                    onTransitionProposal(selectedProposal, "draft")
                  }
                >
                  Reopen as draft
                </Button>
              )}
            </div>

            <section className={styles.copySection}>
              <div className={styles.sectionIndex}>01 / RATIONALE</div>
              <h2>How this proposal works</h2>
              <p className={styles.proposalContent}>
                {selectedProposal.content ||
                  "No rationale has been written yet. Reopen this proposal as a draft to add implementation details, tradeoffs, risks, and assumptions."}
              </p>
            </section>

            <ProposalObjectionsSection
              workspaceId={workspaceId}
              decisionId={decisionId}
              proposal={selectedProposal}
              canEdit={canEdit}
            />

            <footer className={styles.proposalFooter}>
              Updated{" "}
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(selectedProposal.updated_at))}
            </footer>
          </article>
        ) : (
          <article className={styles.document}>
            <div className={styles.documentMeta}>DECISION</div>
            <h1>{title}</h1>
            <p className={styles.lede}>
              {summary || "No decision summary has been added yet."}
            </p>

            <section id="context" className={styles.copySection}>
              <div className={styles.sectionIndex}>01 / CONTEXT</div>
              <h2>Why this needs a decision</h2>
              <p>
                {summary ||
                  "Add context to explain what the team is deciding and why it matters now."}
              </p>
            </section>

            <section id="criteria" className={styles.copySection}>
              <div className={styles.sectionIndex}>02 / CRITERIA</div>
              <h2>What we are optimizing for</h2>
              {criteria.length > 0 ? (
                <ul className={styles.criteriaList}>
                  {criteria.map((criterion, index) => (
                    <li key={criterion.id}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{criterion.name}</strong>
                        <p>
                          {criterion.description ||
                            `Weight: ${criterion.weight}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.emptySection}>
                  <strong>No criteria yet</strong>
                  <p>
                    Criteria will appear here once the team defines how
                    proposals should be evaluated.
                  </p>
                </div>
              )}
            </section>

            <section id="proposals" className={styles.copySection}>
              <div className={styles.sectionIndex}>03 / PROPOSALS</div>
              {proposals.length > 0 ? (
                <div className={styles.leadingProposal}>
                  <div>
                    <Badge variant="light" color="rust" size="sm">
                      PROPOSALS
                    </Badge>
                    <h3>
                      {proposals.length} alternative
                      {proposals.length === 1 ? "" : "s"} in progress
                    </h3>
                    <p>
                      Select a proposal from the outline to read, edit, submit,
                      or withdraw it.
                    </p>
                  </div>
                </div>
              ) : (
                <div className={styles.emptySection}>
                  <strong>No proposals yet</strong>
                  <p>Alternatives will appear here as the team adds them.</p>
                  <Button
                    size="xs"
                    variant="light"
                    color="rust"
                    leftSection={<IconPlus size={14} />}
                    onClick={onCreateProposal}
                    disabled={!canEdit}
                  >
                    Add proposal
                  </Button>
                </div>
              )}
            </section>
          </article>
        )}
      </ScrollArea>
    </section>
  );
}

function CollaborationPanel({
  workspaceId,
  decisionId,
  proposals,
  members,
  currentUserId,
  canModerate,
  canUploadEvidence,
  canManageEvidence,
  decisionLock,
  targetCommentId,
  value,
  onChange,
  onEnterFocus,
}: {
  workspaceId: string;
  decisionId: string;
  proposals: Proposal[];
  members: WorkspaceMember[];
  currentUserId: string;
  canModerate: boolean;
  canUploadEvidence: boolean;
  canManageEvidence: boolean;
  decisionLock: DecisionLock | null;
  targetCommentId: string | null;
  value: CollaborationTab;
  onChange: (value: CollaborationTab) => void;
  onEnterFocus?: () => void;
}) {
  return (
    <section className={styles.panel} aria-label="Collaboration">
      <Tabs
        value={value}
        onChange={(nextValue) =>
          nextValue && onChange(nextValue as CollaborationTab)
        }
        classNames={{
          root: styles.collaborationTabs,
          list: styles.collabTabList,
        }}
      >
        <Tabs.List grow>
          <Tabs.Tab value="discussion">Discussion</Tabs.Tab>
          <Tabs.Tab value="evidence">Evidence</Tabs.Tab>
          <Tabs.Tab value="people">People</Tabs.Tab>
          {onEnterFocus && (
            <Tooltip label="Focus on collaboration">
              <ActionIcon
                className={styles.collaborationFocusButton}
                variant="subtle"
                color="dark"
                aria-label="Focus on collaboration panel"
                onClick={onEnterFocus}
              >
                <IconArrowsMaximize size={16} stroke={1.8} />
              </ActionIcon>
            </Tooltip>
          )}
        </Tabs.List>
        <Tabs.Panel value="discussion" className={styles.collaborationBody}>
          <DiscussionPanel
            workspaceId={workspaceId}
            decisionId={decisionId}
            members={members}
            currentUserId={currentUserId}
            canModerate={canModerate}
            targetCommentId={targetCommentId}
          />
        </Tabs.Panel>
        <Tabs.Panel
          value="evidence"
          className={styles.collaborationEvidencePanel}
        >
          {decisionLock ? (
            <LockedEvidencePanel
              workspaceId={workspaceId}
              decisionLock={decisionLock}
              proposals={proposals}
              members={members}
              compact
            />
          ) : (
            <EvidencePanel
              workspaceId={workspaceId}
              decisionId={decisionId}
              proposals={proposals}
              members={members}
              currentUserId={currentUserId}
              canUpload={canUploadEvidence}
              canManage={canManageEvidence}
            />
          )}
        </Tabs.Panel>
        <Tabs.Panel value="people" className={styles.emptyPanel}>
          <IconUsers size={24} />
          <strong>Presence is not connected yet</strong>
          <span>
            Live participants will appear here once collaboration presence is
            wired.
          </span>
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}

type DecisionRoomProps = {
  workspaceId: string;
  decisionId: string;
};

export function DecisionRoom({ workspaceId, decisionId }: DecisionRoomProps) {
  const currentUser = useCurrentUser();
  const workspace = useWorkspace(workspaceId);
  const members = useWorkspaceMembers(workspaceId);
  const decision = useDecision(workspaceId, decisionId);
  const proposals = useDecisionProposals(workspaceId, decisionId);
  const criteria = useDecisionCriteria(workspaceId, decisionId);
  const votingSessions = useVotingSessions(workspaceId, decisionId);
  const attachments = useDecisionAttachments(
    workspaceId,
    decisionId,
    Boolean(decision.data && decision.data.status !== "locked"),
  );
  const decisionLock = useDecisionLock(
    workspaceId,
    decisionId,
    decision.data?.status === "locked",
  );
  const submittedProposalIds = (proposals.data ?? [])
    .filter((proposal) => proposal.status === "submitted")
    .map((proposal) => proposal.id);
  const readinessObjections = useOpenBlockingObjections(
    workspaceId,
    decisionId,
    decision.data?.status === "locked" ? [] : submittedProposalIds,
  );
  const orderedVotingSessions = [...(votingSessions.data ?? [])].sort(
    (left, right) =>
      new Date(right.created_at).getTime() -
      new Date(left.created_at).getTime(),
  );
  const unfinishedVotingSession = orderedVotingSessions.find(
    (session) => session.status === "draft" || session.status === "open",
  );
  const latestVotingSession = orderedVotingSessions[0] ?? null;
  const latestClosedVotingSession = orderedVotingSessions.find(
    (session) => session.status === "closed",
  );
  const latestClosedVotingResult = useVotingResult(
    workspaceId,
    decisionId,
    latestClosedVotingSession?.id,
    decision.data?.status !== "locked",
  );
  const transitionProposal = useTransitionProposal(workspaceId, decisionId);
  const transitionDecision = useTransitionDecision(workspaceId, decisionId);
  const deleteProposal = useDeleteProposal(workspaceId, decisionId);
  const desktop = useMediaQuery("(min-width: 80em)");
  const mobileTab = useUiStore((state) => state.mobileDecisionTab);
  const setMobileTab = useUiStore((state) => state.setMobileDecisionTab);
  const leftCollapsed = useUiStore((state) => state.decisionRoomLeftCollapsed);
  const rightCollapsed = useUiStore(
    (state) => state.decisionRoomRightCollapsed,
  );
  const focusPanel = useUiStore((state) => state.decisionRoomFocus);
  const setLeftCollapsed = useUiStore(
    (state) => state.setDecisionRoomLeftCollapsed,
  );
  const setRightCollapsed = useUiStore(
    (state) => state.setDecisionRoomRightCollapsed,
  );
  const setFocusPanel = useUiStore((state) => state.setDecisionRoomFocus);
  const resetStoredDecisionRoomLayout = useUiStore(
    (state) => state.resetDecisionRoomLayout,
  );
  const panelGroupRef = useGroupRef();
  const leftPanelRef = usePanelRef();
  const rightPanelRef = usePanelRef();
  const [meetingOpened, setMeetingOpened] = useState(false);
  const [targetCommentId, setTargetCommentId] = useState<string | null>(null);
  const [workMode, setWorkMode] = useState<WorkMode>("document");
  const [collaborationTab, setCollaborationTab] =
    useState<CollaborationTab>("discussion");
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null,
  );
  const [votingActionRequest, setVotingActionRequest] =
    useState<VotingPanelActionRequest | null>(null);
  const votingActionSequence = useRef(0);
  const [editorProposal, setEditorProposal] = useState<
    Proposal | null | undefined
  >(undefined);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "forkroom-decision-room",
    panelIds: ["outline", "document", "collaboration"],
    onlySaveAfterUserInteractions: true,
  });

  useEffect(() => {
    if (!desktop || focusPanel) return;

    const frame = window.requestAnimationFrame(() => {
      if (leftCollapsed) leftPanelRef.current?.collapse();
      else leftPanelRef.current?.expand();

      if (rightCollapsed) rightPanelRef.current?.collapse();
      else rightPanelRef.current?.expand();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [desktop, focusPanel, leftCollapsed, rightCollapsed]);

  useEffect(() => {
    const targetComment = new URLSearchParams(window.location.search).get(
      "comment",
    );
    if (!targetComment) return;

    setTargetCommentId(targetComment);
    setCollaborationTab("discussion");
    if (desktop) {
      setRightCollapsed(false);
      rightPanelRef.current?.expand();
    } else {
      setMobileTab("discussion");
    }
  }, [desktop, setMobileTab, setRightCollapsed]);

  useEffect(() => {
    if (!desktop) return;

    const handleWorkspaceShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select") ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === "Escape" && focusPanel) {
        event.preventDefault();
        setFocusPanel(null);
        return;
      }

      if (!event.altKey) return;
      const panel =
        event.key === "1"
          ? "outline"
          : event.key === "2"
            ? "document"
            : event.key === "3"
              ? "collaboration"
              : null;
      if (!panel) return;

      event.preventDefault();
      setFocusPanel(panel);
    };

    window.addEventListener("keydown", handleWorkspaceShortcut);
    return () => window.removeEventListener("keydown", handleWorkspaceShortcut);
  }, [desktop, focusPanel, setFocusPanel]);

  if (
    currentUser.isPending ||
    workspace.isPending ||
    members.isPending ||
    decision.isPending ||
    proposals.isPending ||
    criteria.isPending ||
    votingSessions.isPending ||
    (decision.data?.status === "locked" && decisionLock.isPending)
  ) {
    return <DecisionRoomSkeleton />;
  }

  if (
    workspace.isError ||
    currentUser.isError ||
    members.isError ||
    decision.isError ||
    proposals.isError ||
    criteria.isError ||
    votingSessions.isError ||
    (decision.data?.status === "locked" && decisionLock.isError) ||
    !currentUser.data ||
    !workspace.data ||
    !members.data ||
    !decision.data ||
    !proposals.data ||
    !criteria.data ||
    !votingSessions.data ||
    (decision.data.status === "locked" && !decisionLock.data)
  ) {
    const loadError =
      workspace.error ??
      currentUser.error ??
      members.error ??
      decision.error ??
      proposals.error ??
      criteria.error ??
      votingSessions.error ??
      decisionLock.error;

    return (
      <div className={styles.roomState}>
        <RecoveryState
          error={loadError}
          title="Decision Room unavailable"
          fallback="The decision could not be loaded. It may have been removed or your workspace access changed."
          onRetry={() => {
            void currentUser.refetch();
            void workspace.refetch();
            void members.refetch();
            void decision.refetch();
            void proposals.refetch();
            void criteria.refetch();
            void votingSessions.refetch();
            if (decision.data?.status === "locked") void decisionLock.refetch();
          }}
        />
      </div>
    );
  }

  const selectedProposal =
    proposals.data.find((proposal) => proposal.id === selectedProposalId) ??
    proposals.data[0] ??
    null;
  const currentMember = members.data.find(
    (member) => member.user_id === currentUser.data.id,
  );
  const canContribute = ["owner", "admin", "member"].includes(
    currentMember?.role ?? "viewer",
  );
  const canManageVoting = ["owner", "admin"].includes(
    currentMember?.role ?? "viewer",
  );
  const hasOpenVotingSession = votingSessions.data.some(
    (session) => session.status === "open",
  );
  const canEditProposals =
    canContribute &&
    !hasOpenVotingSession &&
    !["closed", "locked", "archived"].includes(decision.data.status);
  const canUploadEvidence =
    canContribute &&
    !hasOpenVotingSession &&
    !["closed", "locked", "archived"].includes(decision.data.status);
  const evidenceCount = decisionLock.data
    ? getSnapshotEvidence(decisionLock.data.snapshot).length
    : (attachments.data ?? []).filter(
        (attachment) => attachment.status !== "deleted",
      ).length;
  const eligibleVoterCount = members.data.filter((member) =>
    ["owner", "admin", "member"].includes(member.role),
  ).length;
  const processingEvidenceCount = (attachments.data ?? []).filter(
    (attachment) =>
      attachment.status === "pending" || attachment.status === "processing",
  ).length;
  const votingIsOpen = unfinishedVotingSession?.status === "open";
  const draftVotingSession =
    unfinishedVotingSession?.status === "draft"
      ? unfinishedVotingSession
      : null;
  const readinessChecking =
    !votingIsOpen && (readinessObjections.isPending || attachments.isPending);
  const readinessIssues: string[] = [];

  if (!votingIsOpen) {
    if (decision.data.status === "draft") {
      readinessIssues.push(
        "Activate this decision before creating or opening a voting round.",
      );
    } else if (decision.data.status !== "active") {
      readinessIssues.push(
        `Voting cannot start while the decision is ${decision.data.status}.`,
      );
    }
    if (!draftVotingSession) {
      readinessIssues.push(
        "Create a draft voting round and configure its quorum.",
      );
    }
    if (submittedProposalIds.length < 2) {
      readinessIssues.push(
        `Submit at least two proposals. ${submittedProposalIds.length} ${
          submittedProposalIds.length === 1 ? "is" : "are"
        } currently active.`,
      );
    }
    if (eligibleVoterCount === 0) {
      readinessIssues.push(
        "Add at least one owner, admin, or member who is eligible to vote.",
      );
    }
    if (readinessObjections.isError) {
      readinessIssues.push(
        "Blocking objections could not be verified. Retry before opening voting.",
      );
    } else if (readinessObjections.objections.length > 0) {
      readinessIssues.push(
        `Resolve or dismiss ${readinessObjections.objections.length} open blocking objection${
          readinessObjections.objections.length === 1 ? "" : "s"
        } before opening voting.`,
      );
    }
    if (attachments.isError) {
      readinessIssues.push(
        "Evidence processing could not be verified. Retry before opening voting.",
      );
    } else if (processingEvidenceCount > 0) {
      readinessIssues.push(
        `Wait for ${processingEvidenceCount} evidence file${
          processingEvidenceCount === 1 ? "" : "s"
        } to finish processing.`,
      );
    }
    if (
      draftVotingSession?.closes_at &&
      new Date(draftVotingSession.closes_at).getTime() <= Date.now()
    ) {
      readinessIssues.push(
        "The configured voting close time has passed. Cancel this round and create a new one.",
      );
    }
  }

  const votingReadiness: VotingReadiness = {
    activeProposalCount: submittedProposalIds.length,
    eligibleVoterCount:
      votingIsOpen && unfinishedVotingSession
        ? unfinishedVotingSession.eligible_voter_count
        : eligibleVoterCount,
    quorumPercentage: unfinishedVotingSession?.quorum_percentage ?? null,
    blockingObjectionCount:
      readinessObjections.isPending || readinessObjections.isError
        ? null
        : readinessObjections.objections.length,
    processingEvidenceCount:
      attachments.isPending || attachments.isError
        ? null
        : processingEvidenceCount,
    issues: readinessIssues,
    isChecking: readinessChecking,
    votingIsOpen,
  };
  const lifecycleStage: DecisionLifecycleStage =
    decision.data.status === "locked"
      ? "locked"
      : decision.data.status === "draft"
        ? "draft"
        : unfinishedVotingSession
          ? "voting"
          : latestVotingSession?.status === "closed" ||
              decision.data.status === "closed" ||
              decision.data.status === "archived"
            ? "closed"
            : "active";

  const openEvidence = () => {
    setCollaborationTab("evidence");
    if (desktop) {
      rightPanelRef.current?.expand();
      return;
    }

    setMobileTab("discussion");
  };

  const selectProposal = (proposal: Proposal) => {
    setSelectedProposalId(proposal.id);
    setWorkMode("proposal");
    if (!desktop) setMobileTab("document");
  };

  const handleTransitionProposal = async (
    proposal: Proposal,
    status: Proposal["status"],
  ) => {
    try {
      const updated = await transitionProposal.mutateAsync({
        proposalId: proposal.id,
        status,
      });
      setSelectedProposalId(updated.id);
      setWorkMode("proposal");
      notifications.show({
        color: "green",
        title: "Proposal updated",
        message:
          status === "submitted"
            ? "The proposal is ready for team review."
            : status === "withdrawn"
              ? "The proposal has been withdrawn."
              : "The proposal is open for editing again.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Could not update proposal",
        message: getApiErrorMessage(
          error,
          "ForkRoom could not change this proposal state.",
          "decision-transition",
        ),
      });
    }
  };

  const confirmActivateDecision = () => {
    modals.openConfirmModal({
      title: "Activate this decision?",
      children: (
        <p className={styles.confirmCopy}>
          The decision will enter active discussion. Owners and administrators
          can then create a draft voting round when the team is ready.
        </p>
      ),
      labels: { confirm: "Activate decision", cancel: "Keep as draft" },
      confirmProps: { color: "rust" },
      onConfirm: async () => {
        try {
          await transitionDecision.mutateAsync({ status: "active" });
          notifications.show({
            color: "green",
            title: "Decision activated",
            message: "Voting-round preparation is now available.",
          });
        } catch (error) {
          notifications.show({
            color: "red",
            title: "Could not activate decision",
            message: getApiErrorMessage(
              error,
              "ForkRoom could not activate this decision.",
              "decision-transition",
            ),
          });
        }
      },
    });
  };

  const confirmReopenDecision = () => {
    modals.openConfirmModal({
      title: "Reopen this decision?",
      children: (
        <p className={styles.confirmCopy}>
          Locking requires an active decision. Reopening returns this decision
          to active work without changing the closed voting result.
        </p>
      ),
      labels: { confirm: "Reopen decision", cancel: "Keep closed" },
      confirmProps: { color: "rust" },
      onConfirm: async () => {
        try {
          await transitionDecision.mutateAsync({ status: "active" });
          notifications.show({
            color: "green",
            title: "Decision reopened",
            message: "The closed result can now be reviewed and locked.",
          });
        } catch (error) {
          notifications.show({
            color: "red",
            title: "Could not reopen decision",
            message: getApiErrorMessage(
              error,
              "ForkRoom could not return this decision to active work.",
              "decision-transition",
            ),
          });
        }
      },
    });
  };

  const requestVotingAction = (action: VotingPanelAction) => {
    setFocusPanel(null);
    setWorkMode("vote");
    if (!desktop) setMobileTab("vote");
    votingActionSequence.current += 1;
    setVotingActionRequest({ id: votingActionSequence.current, action });
  };

  const openLockedExport = () => {
    setFocusPanel(null);
    setWorkMode("document");
    if (!desktop) setMobileTab("document");

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.document
          .getElementById("decision-export-heading")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const confirmDeleteProposal = (proposal: Proposal) => {
    modals.openConfirmModal({
      title: "Delete draft proposal?",
      children: (
        <p className={styles.confirmCopy}>
          “{proposal.title}” will be permanently removed. Submitted proposals
          must be reopened before they can be deleted.
        </p>
      ),
      labels: { confirm: "Delete proposal", cancel: "Keep proposal" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteProposal.mutateAsync(proposal.id);
          if (selectedProposal?.id === proposal.id) {
            setSelectedProposalId(null);
            setWorkMode("document");
          }
          notifications.show({
            color: "green",
            title: "Draft deleted",
            message: "The proposal was removed from this decision.",
          });
        } catch (error) {
          notifications.show({
            color: "red",
            title: "Could not delete proposal",
            message: getApiErrorMessage(
              error,
              "ForkRoom could not delete this draft proposal.",
            ),
          });
        }
      },
    });
  };

  const togglePanel = (side: "left" | "right") => {
    const ref = side === "left" ? leftPanelRef : rightPanelRef;
    const collapsed = side === "left" ? leftCollapsed : rightCollapsed;
    if (collapsed) ref.current?.expand();
    else ref.current?.collapse();
  };

  const enterFocusMode = (panel: FocusPanel) => {
    setFocusPanel(panel);
  };

  const resetDecisionRoomLayout = () => {
    resetStoredDecisionRoomLayout();
    leftPanelRef.current?.expand();
    rightPanelRef.current?.expand();

    window.requestAnimationFrame(() => {
      leftPanelRef.current?.resize(260);
      rightPanelRef.current?.resize(340);

      window.requestAnimationFrame(() => {
        const layout = panelGroupRef.current?.getLayout();
        if (layout) {
          window.localStorage.setItem(
            DECISION_ROOM_LAYOUT_STORAGE_KEY,
            JSON.stringify(layout),
          );
        }
      });
    });

    notifications.show({
      color: "gray",
      title: "Decision Room layout reset",
      message: "Outline, primary canvas, and collaboration are visible again.",
    });
  };

  const changeMobileSurface = (value: string | null) => {
    if (!value) return;

    const nextTab = value as typeof mobileTab;
    setMobileTab(nextTab);

    if (nextTab === "vote") setWorkMode("vote");
    else if (nextTab === "document" && workMode === "vote") {
      setWorkMode("document");
    }
  };

  const primaryAction = (() => {
    if (lifecycleStage === "draft") {
      if (!canManageVoting) return null;
      return {
        label: "Activate decision",
        icon: <IconPlayerPlay size={17} />,
        color: "rust",
        disabled: transitionDecision.isPending,
        reason: null,
        onClick: confirmActivateDecision,
      };
    }

    if (lifecycleStage === "active") {
      if (!canManageVoting) return null;
      return {
        label: "Create voting round",
        icon: <IconScale size={17} />,
        color: "rust",
        disabled: false,
        reason: null,
        onClick: () => requestVotingAction("create-round"),
      };
    }

    if (lifecycleStage === "voting") {
      if (unfinishedVotingSession?.status === "draft") {
        if (!canManageVoting) return null;
        return {
          label: "Open voting",
          icon: <IconPlayerPlay size={17} />,
          color: "rust",
          disabled: readinessChecking || readinessIssues.length > 0,
          reason: readinessChecking
            ? "ForkRoom is still verifying voting readiness."
            : (readinessIssues[0] ?? null),
          onClick: () => requestVotingAction("open-voting"),
        };
      }

      if (canManageVoting) {
        return {
          label: "Close voting",
          icon: <IconPlayerStop size={17} />,
          color: "dark",
          disabled: false,
          reason: null,
          onClick: () => requestVotingAction("close-voting"),
        };
      }

      if (!canContribute) return null;
      return {
        label: "Cast vote",
        icon: <IconCheck size={17} />,
        color: "rust",
        disabled: false,
        reason: null,
        onClick: () => requestVotingAction("cast-vote"),
      };
    }

    if (lifecycleStage === "closed") {
      if (decision.data.status === "archived") return null;

      if (decision.data.status === "closed") {
        if (!canManageVoting) return null;
        return {
          label: "Reopen to lock",
          icon: <IconRestore size={17} />,
          color: "rust",
          disabled: transitionDecision.isPending,
          reason:
            "The backend requires an active decision before a result can be locked.",
          onClick: confirmReopenDecision,
        };
      }

      const resultCanBeLocked = Boolean(
        latestClosedVotingResult.data?.result_valid &&
          !latestClosedVotingResult.data.is_tie &&
          latestClosedVotingResult.data.winner_proposal_id,
      );

      if (canManageVoting && resultCanBeLocked) {
        return {
          label: "Lock decision",
          icon: <IconLock size={17} />,
          color: "dark",
          disabled: false,
          reason: null,
          onClick: () => requestVotingAction("lock-decision"),
        };
      }

      return {
        label: "Review result",
        icon: <IconScale size={17} />,
        color: "rust",
        disabled: false,
        reason: latestClosedVotingResult.isPending
          ? "The result is still loading."
          : latestClosedVotingResult.data?.is_tie
            ? "The result is tied and cannot be locked yet."
            : latestClosedVotingResult.data &&
                !latestClosedVotingResult.data.result_valid
              ? "Quorum was not met, so this result cannot be locked."
              : null,
        onClick: () => requestVotingAction("review-result"),
      };
    }

    if (lifecycleStage === "locked") {
      return {
        label: "Export decision",
        icon: <IconFileExport size={17} />,
        color: "rust",
        disabled: false,
        reason: null,
        onClick: openLockedExport,
      };
    }

    return null;
  })();

  const outline = (
    <OutlinePanel
      workspaceId={workspaceId}
      decisionId={decisionId}
      proposals={proposals.data}
      criteriaCount={criteria.data.length}
      evidenceCount={evidenceCount}
      selectedProposalId={selectedProposal?.id ?? null}
      canEdit={canEditProposals}
      transitionPending={transitionProposal.isPending}
      onSelectProposal={selectProposal}
      onCreateProposal={() => setEditorProposal(null)}
      onEditProposal={(proposal) => setEditorProposal(proposal)}
      onTransitionProposal={handleTransitionProposal}
      onDeleteProposal={confirmDeleteProposal}
      onOpenEvidence={openEvidence}
      onEnterFocus={
        desktop && !focusPanel ? () => enterFocusMode("outline") : undefined
      }
    />
  );
  const document = (
    <DocumentPanel
      workspaceId={workspaceId}
      decisionId={decisionId}
      title={decision.data.title}
      summary={decision.data.summary}
      criteria={criteria.data}
      proposals={proposals.data}
      votingSessions={votingSessions.data}
      decisionStatus={decision.data.status}
      decisionLock={decisionLock.data ?? null}
      members={members.data}
      currentUserId={currentUser.data.id}
      isLocked={decision.data.status === "locked"}
      selectedProposal={selectedProposal}
      mode={workMode}
      canEdit={canEditProposals}
      canManageVoting={canManageVoting}
      canRequestExport={canContribute}
      canCreateActions={canContribute}
      canManageFollowThrough={canManageVoting}
      votingReadiness={votingReadiness}
      votingActionRequest={votingActionRequest}
      transitionPending={transitionProposal.isPending}
      onModeChange={setWorkMode}
      onCreateProposal={() => setEditorProposal(null)}
      onEditProposal={(proposal) => setEditorProposal(proposal)}
      onTransitionProposal={handleTransitionProposal}
      onVotingActionHandled={(requestId) =>
        setVotingActionRequest((current) =>
          current?.id === requestId ? null : current,
        )
      }
      onEnterFocus={
        desktop && !focusPanel ? () => enterFocusMode("document") : undefined
      }
    />
  );
  const collaboration = (
    <CollaborationPanel
      workspaceId={workspaceId}
      decisionId={decisionId}
      proposals={proposals.data}
      members={members.data}
      currentUserId={currentUser.data.id}
      canModerate={canManageVoting}
      canUploadEvidence={canUploadEvidence}
      canManageEvidence={canManageVoting}
      decisionLock={decisionLock.data ?? null}
      targetCommentId={targetCommentId}
      value={collaborationTab}
      onChange={setCollaborationTab}
      onEnterFocus={
        desktop && !focusPanel
          ? () => enterFocusMode("collaboration")
          : undefined
      }
    />
  );

  const focusedContent =
    focusPanel === "outline"
      ? outline
      : focusPanel === "collaboration"
        ? collaboration
        : document;
  const focusLabel =
    focusPanel === "outline"
      ? "Decision outline"
      : focusPanel === "collaboration"
        ? "Collaboration"
        : "Primary canvas";

  return (
    <div className={styles.room}>
      <header className={styles.roomHeader}>
        <div className={styles.titleBlock}>
          <div className={styles.breadcrumb}>
            {workspace.data.name.toUpperCase()} <IconChevronRight size={12} />{" "}
            DECISIONS
          </div>
          <div className={styles.titleRow}>
            <h1>{decision.data.title}</h1>
          </div>
        </div>

        <div className={styles.roomActions}>
          <Button
            className={styles.meetingButton}
            variant="default"
            leftSection={<IconVideo size={17} />}
            onClick={() => setMeetingOpened(true)}
          >
            <span className={styles.meetingButtonLabel}>Meeting</span>
          </Button>
          {desktop &&
            (focusPanel ? (
              <Button
                variant="default"
                size="compact-sm"
                leftSection={<IconArrowsMinimize size={16} />}
                onClick={() => setFocusPanel(null)}
              >
                Exit focus
              </Button>
            ) : (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <Button
                    className={styles.layoutButton}
                    variant="default"
                    size="compact-sm"
                    leftSection={<IconAdjustmentsHorizontal size={16} />}
                  >
                    Layout
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Decision Room panels</Menu.Label>
                  <Menu.Item
                    leftSection={<IconLayoutSidebarLeftCollapse size={16} />}
                    onClick={() => togglePanel("left")}
                  >
                    {leftCollapsed ? "Show outline" : "Hide outline"}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconLayoutSidebarRightCollapse size={16} />}
                    onClick={() => togglePanel("right")}
                  >
                    {rightCollapsed
                      ? "Show collaboration"
                      : "Hide collaboration"}
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Label>Focus mode</Menu.Label>
                  <Menu.Item
                    leftSection={<IconArrowsMaximize size={16} />}
                    rightSection={
                      <kbd className={styles.menuShortcut}>Alt+1</kbd>
                    }
                    onClick={() => enterFocusMode("outline")}
                  >
                    Focus outline
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconArrowsMaximize size={16} />}
                    rightSection={
                      <kbd className={styles.menuShortcut}>Alt+2</kbd>
                    }
                    onClick={() => enterFocusMode("document")}
                  >
                    Focus primary canvas
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconArrowsMaximize size={16} />}
                    rightSection={
                      <kbd className={styles.menuShortcut}>Alt+3</kbd>
                    }
                    onClick={() => enterFocusMode("collaboration")}
                  >
                    Focus collaboration
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconRestore size={16} />}
                    onClick={resetDecisionRoomLayout}
                  >
                    Reset layout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ))}
          {primaryAction && (
            <Tooltip
              label={primaryAction.reason ?? primaryAction.label}
              disabled={!primaryAction.reason}
              withArrow
            >
              <div className={styles.primaryActionDesktop}>
                <Button
                  color={primaryAction.color}
                  leftSection={primaryAction.icon}
                  disabled={primaryAction.disabled}
                  onClick={primaryAction.onClick}
                >
                  {primaryAction.label}
                </Button>
              </div>
            </Tooltip>
          )}
        </div>
      </header>

      <DecisionLifecycleIndicator stage={lifecycleStage} />

      <div className={styles.workspace}>
        {desktop ? (
          focusPanel ? (
            <section className={styles.focusWorkspace} aria-label={focusLabel}>
              <div className={styles.focusBar}>
                <div>
                  <IconArrowsMaximize size={15} />
                  <span>FOCUS MODE</span>
                  <strong>{focusLabel}</strong>
                </div>
                <Button
                  variant="subtle"
                  color="dark"
                  size="compact-sm"
                  leftSection={<IconArrowsMinimize size={16} />}
                  onClick={() => setFocusPanel(null)}
                >
                  Exit focus <kbd>Esc</kbd>
                </Button>
              </div>
              <div className={styles.focusSurface}>{focusedContent}</div>
            </section>
          ) : (
            <>
              <Group
                id="decision-room-layout"
                groupRef={panelGroupRef}
                orientation="horizontal"
                defaultLayout={defaultLayout}
                onLayoutChanged={onLayoutChanged}
                className={styles.panelGroup}
              >
                <Panel
                  id="outline"
                  panelRef={leftPanelRef}
                  defaultSize={260}
                  minSize={220}
                  maxSize={360}
                  collapsedSize={0}
                  collapsible
                  onResize={(size) => setLeftCollapsed(size.inPixels < 1)}
                >
                  {outline}
                </Panel>
                <Separator
                  className={styles.resizeHandle}
                  aria-label="Resize decision outline"
                />
                <Panel id="document" minSize={520} defaultSize="55%">
                  {document}
                </Panel>
                <Separator
                  className={styles.resizeHandle}
                  aria-label="Resize collaboration panel"
                />
                <Panel
                  id="collaboration"
                  panelRef={rightPanelRef}
                  defaultSize={340}
                  minSize={280}
                  maxSize={440}
                  collapsedSize={0}
                  collapsible
                  onResize={(size) => setRightCollapsed(size.inPixels < 1)}
                >
                  {collaboration}
                </Panel>
              </Group>

              {leftCollapsed && (
                <button
                  type="button"
                  className={`${styles.restorePanelButton} ${styles.restorePanelLeft}`}
                  onClick={() => togglePanel("left")}
                >
                  <IconLayoutSidebarLeftCollapse size={16} />
                  <span>Show outline</span>
                </button>
              )}
              {rightCollapsed && (
                <button
                  type="button"
                  className={`${styles.restorePanelButton} ${styles.restorePanelRight}`}
                  onClick={() => togglePanel("right")}
                >
                  <span>Show collaboration</span>
                  <IconLayoutSidebarRightCollapse size={16} />
                </button>
              )}
            </>
          )
        ) : (
          <div className={styles.responsiveWorkspace}>
            <Tabs value={mobileTab} onChange={changeMobileSurface}>
              <Tabs.List grow className={styles.responsiveTabs}>
                <Tabs.Tab value="outline">Outline</Tabs.Tab>
                <Tabs.Tab value="document">Document</Tabs.Tab>
                <Tabs.Tab value="vote">Vote</Tabs.Tab>
                <Tabs.Tab value="discussion">Discussion</Tabs.Tab>
              </Tabs.List>
              <div
                className={styles.responsivePanel}
                role="tabpanel"
                aria-label={`${mobileTab} decision view`}
              >
                {mobileTab === "outline"
                  ? outline
                  : mobileTab === "discussion"
                    ? collaboration
                    : document}
              </div>
            </Tabs>
          </div>
        )}
      </div>

      {primaryAction && (
        <div className={styles.mobileVoteDock}>
          <Tooltip
            label={primaryAction.reason ?? primaryAction.label}
            disabled={!primaryAction.reason}
            withArrow
          >
            <div>
              <Button
                fullWidth
                color={primaryAction.color}
                leftSection={primaryAction.icon}
                disabled={primaryAction.disabled}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            </div>
          </Tooltip>
        </div>
      )}

      <ProposalEditorModal
        workspaceId={workspaceId}
        decisionId={decisionId}
        proposal={editorProposal ?? null}
        opened={editorProposal !== undefined}
        onClose={() => setEditorProposal(undefined)}
        onSaved={(proposal) => {
          setSelectedProposalId(proposal.id);
          setWorkMode("proposal");
          if (!desktop) setMobileTab("document");
          notifications.show({
            color: "green",
            title: editorProposal ? "Proposal saved" : "Proposal created",
            message: "The proposal is available in the decision outline.",
          });
        }}
      />

      <MeetingDock
        workspaceId={workspaceId}
        decisionId={decisionId}
        currentUser={{
          id: currentUser.data.id,
          displayName: currentUser.data.display_name,
          role: currentMember?.role ?? "viewer",
        }}
        opened={meetingOpened}
        protectedActionVisible={Boolean(primaryAction)}
        onOpen={() => setMeetingOpened(true)}
        onClose={() => setMeetingOpened(false)}
      />
    </div>
  );
}
