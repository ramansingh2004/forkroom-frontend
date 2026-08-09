'use client';

import { useState } from 'react';
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
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconArrowBackUp,
  IconAlertTriangle,
  IconCheck,
  IconCircleOff,
  IconChevronRight,
  IconDotsVertical,
  IconEdit,
  IconFileText,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
  IconLock,
  IconPlus,
  IconMessageExclamation,
  IconRestore,
  IconScale,
  IconSend,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  usePanelRef,
} from 'react-resizable-panels';

import { useCurrentUser } from '@/hooks/use-auth';
import {
  useDeleteProposal,
  useDecision,
  useDecisionCriteria,
  useDecisionLock,
  useDecisionProposals,
  useProposalObjections,
  useTransitionProposal,
  useWorkspace,
  useWorkspaceMembers,
  useVotingSessions,
} from '@/hooks/use-workspaces';
import { getApiErrorMessage } from '@/services/auth.service';
import type {
  Criterion,
  DecisionLock,
  Objection,
  ObjectionStatus,
  Proposal,
  VotingSession,
  WorkspaceMember,
} from '@/services/workspace.service';
import { useUiStore } from '@/stores/use-ui-store';

import styles from './decision-room.module.css';
import { ObjectionEditorModal } from './objection-editor-modal';
import { ObjectionStatusModal } from './objection-status-modal';
import { LockedDecisionPanel } from './locked-decision-panel';
import { ProposalEditorModal } from './proposal-editor-modal';
import { VotingPanel } from './voting-panel';

type WorkMode = 'document' | 'proposal' | 'compare' | 'vote';

function ProposalObjectionCount({
  workspaceId,
  decisionId,
  proposalId,
}: {
  workspaceId: string;
  decisionId: string;
  proposalId: string;
}) {
  const objections = useProposalObjections(workspaceId, decisionId, proposalId, {
    status: 'open',
  });

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
  selectedProposalId,
  canEdit,
  transitionPending,
  onSelectProposal,
  onCreateProposal,
  onEditProposal,
  onTransitionProposal,
  onDeleteProposal,
}: {
  workspaceId: string;
  decisionId: string;
  proposals: Proposal[];
  criteriaCount: number;
  selectedProposalId: string | null;
  canEdit: boolean;
  transitionPending: boolean;
  onSelectProposal: (proposal: Proposal) => void;
  onCreateProposal: () => void;
  onEditProposal: (proposal: Proposal) => void;
  onTransitionProposal: (proposal: Proposal, status: Proposal['status']) => void;
  onDeleteProposal: (proposal: Proposal) => void;
}) {
  return (
    <section className={styles.panel} aria-label="Decision outline">
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.kicker}>OUTLINE</span>
          <h2>Decision context</h2>
        </div>
        <Tooltip label={canEdit ? 'Add proposal' : 'This decision is read-only'}>
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

      <ScrollArea className={styles.panelScroll} type="auto">
        <nav className={styles.outlineNav} aria-label="Decision sections">
          <a href="#context" className={styles.outlineLinkActive}>Context</a>
          <a href="#criteria">Criteria <span>{criteriaCount}</span></a>
          <a href="#proposals">Proposals <span>{proposals.length}</span></a>
        </nav>

        <div className={styles.sectionHeading}>
          <span>PROPOSALS</span>
          <span>{proposals.length}</span>
        </div>

        {proposals.length > 0 ? (
          <div className={styles.proposalList}>
            {proposals.map((proposal, index) => (
              <div
                key={proposal.id}
                className={styles.proposalItem}
              >
                <button
                  type="button"
                  className={`${styles.proposal} ${
                    proposal.id === selectedProposalId ? styles.proposalSelected : ''
                  }`}
                  onClick={() => onSelectProposal(proposal)}
                  aria-current={proposal.id === selectedProposalId ? 'true' : undefined}
                >
                  <span className={styles.proposalNumber}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <strong>{proposal.title}</strong>
                  <small>{proposal.summary || proposal.status}</small>
                  <span className={styles.proposalStatus}>{proposal.status}</span>
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
                      {proposal.status === 'draft' && (
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
                            onClick={() => onTransitionProposal(proposal, 'submitted')}
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

                      {proposal.status === 'submitted' && (
                        <>
                          <Menu.Item
                            leftSection={<IconArrowBackUp size={15} />}
                            disabled={transitionPending}
                            onClick={() => onTransitionProposal(proposal, 'draft')}
                          >
                            Reopen as draft
                          </Menu.Item>
                          <Menu.Item
                            color="orange"
                            leftSection={<IconCircleOff size={15} />}
                            disabled={transitionPending}
                            onClick={() => onTransitionProposal(proposal, 'withdrawn')}
                          >
                            Withdraw proposal
                          </Menu.Item>
                        </>
                      )}

                      {proposal.status === 'withdrawn' && (
                        <Menu.Item
                          leftSection={<IconArrowBackUp size={15} />}
                          disabled={transitionPending}
                          onClick={() => onTransitionProposal(proposal, 'draft')}
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
            <p>Add an alternative that the team can compare, challenge, and vote on.</p>
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
  const objections = useProposalObjections(workspaceId, decisionId, proposal.id);
  const [editorObjection, setEditorObjection] = useState<Objection | null | undefined>(undefined);
  const [statusChange, setStatusChange] = useState<{
    objection: Objection;
    status: ObjectionStatus;
  } | null>(null);
  const canRaiseObjection = canEdit && proposal.status === 'submitted';
  const orderedObjections = [...(objections.data ?? [])].sort((left, right) => {
    const statusOrder = { open: 0, resolved: 1, dismissed: 2 } as const;
    const severityOrder = { blocking: 0, major: 1, informational: 2 } as const;

    return (
      statusOrder[left.status] - statusOrder[right.status] ||
      severityOrder[left.severity] - severityOrder[right.severity]
    );
  });
  const openCount = orderedObjections.filter((objection) => objection.status === 'open').length;
  const openBlockingCount = orderedObjections.filter(
    (objection) => objection.status === 'open' && objection.severity === 'blocking',
  ).length;

  const statusColor = (status: Objection['status']) => {
    if (status === 'resolved') return 'green';
    if (status === 'dismissed') return 'orange';
    return 'red';
  };

  const severityColor = (severity: Objection['severity']) => {
    if (severity === 'blocking') return 'red';
    if (severity === 'major') return 'orange';
    return 'blue';
  };

  return (
    <section className={styles.objectionsSection} aria-labelledby="proposal-objections-title">
      <div className={styles.objectionsHeading}>
        <div>
          <div className={styles.sectionIndex}>02 / OBJECTIONS</div>
          <h2 id="proposal-objections-title">Challenges to this proposal</h2>
          <p>
            Open concerns stay visible here so they cannot be lost in general discussion.
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

      {!canRaiseObjection && proposal.status !== 'submitted' && (
        <Alert color="gray" title="Submit this proposal before objections can be raised">
          Objections belong to review-ready proposals. Existing objections remain visible.
        </Alert>
      )}

      {openBlockingCount > 0 && (
        <div className={styles.blockingNotice} role="status">
          <IconAlertTriangle size={18} />
          <div>
            <strong>
              {openBlockingCount} blocking objection{openBlockingCount === 1 ? '' : 's'} open
            </strong>
            <span>These concerns must be resolved or dismissed before commitment.</span>
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
          ForkRoom could not load the objections for this proposal.
        </Alert>
      )}

      {!objections.isPending && !objections.isError && orderedObjections.length === 0 && (
        <div className={styles.emptySection}>
          <strong>No objections have been raised</strong>
          <p>
            The proposal has no recorded concerns yet. Team members can add informational,
            major, or blocking objections after it is submitted.
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
                objection.status !== 'open' ? styles.objectionCardClosed : ''
              }`}
            >
              <div className={styles.objectionCardHeader}>
                <div className={styles.objectionBadges}>
                  <Badge variant="light" color={severityColor(objection.severity)} size="sm">
                    {objection.severity}
                  </Badge>
                  <Badge variant="outline" color={statusColor(objection.status)} size="sm">
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
                      {objection.status === 'open' ? (
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
                              setStatusChange({ objection, status: 'resolved' })
                            }
                          >
                            Mark resolved
                          </Menu.Item>
                          <Menu.Item
                            color="orange"
                            leftSection={<IconCircleOff size={15} />}
                            onClick={() =>
                              setStatusChange({ objection, status: 'dismissed' })
                            }
                          >
                            Dismiss with note
                          </Menu.Item>
                        </>
                      ) : (
                        <Menu.Item
                          leftSection={<IconRestore size={15} />}
                          onClick={() => setStatusChange({ objection, status: 'open' })}
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
                    {objection.status === 'resolved' ? 'Resolution' : 'Dismissal note'}
                  </strong>
                  <span>{objection.resolution_note}</span>
                </div>
              )}

              <footer>
                Raised{' '}
                {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
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
            color: 'green',
            title: editorObjection ? 'Objection saved' : 'Objection raised',
            message:
              savedObjection.severity === 'blocking'
                ? 'This blocking concern is now visible in the decision record.'
                : 'The concern is now visible on this proposal.',
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
            color: updatedObjection.status === 'resolved' ? 'green' : 'orange',
            title: 'Objection updated',
            message:
              updatedObjection.status === 'open'
                ? 'The objection is open for review again.'
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
  decisionLock,
  members,
  isLocked,
  selectedProposal,
  mode,
  canEdit,
  canManageVoting,
  canRequestExport,
  transitionPending,
  onModeChange,
  onCreateProposal,
  onEditProposal,
  onTransitionProposal,
}: {
  workspaceId: string;
  decisionId: string;
  title: string;
  summary: string | null;
  criteria: Criterion[];
  proposals: Proposal[];
  votingSessions: VotingSession[];
  decisionLock: DecisionLock | null;
  members: WorkspaceMember[];
  isLocked: boolean;
  selectedProposal: Proposal | null;
  mode: WorkMode;
  canEdit: boolean;
  canManageVoting: boolean;
  canRequestExport: boolean;
  transitionPending: boolean;
  onModeChange: (mode: WorkMode) => void;
  onCreateProposal: () => void;
  onEditProposal: (proposal: Proposal) => void;
  onTransitionProposal: (proposal: Proposal, status: Proposal['status']) => void;
}) {
  return (
    <section className={`${styles.panel} ${styles.documentPanel}`} aria-label="Decision document">
      <div className={styles.documentToolbar}>
        <Tabs
          value={isLocked ? 'document' : mode}
          onChange={(value) => value && onModeChange(value as WorkMode)}
          variant="unstyled"
          classNames={{ list: styles.modeTabs, tab: styles.modeTab }}
        >
          <Tabs.List aria-label="Decision work mode">
            <Tabs.Tab value="document">{isLocked ? 'Locked record' : 'Document'}</Tabs.Tab>
            {!isLocked && (
              <>
                <Tabs.Tab value="proposal" disabled={!selectedProposal}>Proposal</Tabs.Tab>
                <Tabs.Tab value="compare" disabled>Compare</Tabs.Tab>
                <Tabs.Tab value="vote">Vote</Tabs.Tab>
              </>
            )}
          </Tabs.List>
        </Tabs>
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
            canRequestExport={canRequestExport}
          />
        ) : mode === 'vote' ? (
          <VotingPanel
            workspaceId={workspaceId}
            decisionId={decisionId}
            proposals={proposals}
            sessions={votingSessions}
            canManageVoting={canManageVoting}
          />
        ) : mode === 'proposal' && selectedProposal ? (
          <article className={`${styles.document} ${styles.proposalDocument}`}>
            <div className={styles.proposalIdentity}>
              <div>
                <span className={styles.documentMeta}>PROPOSAL</span>
                <h1>{selectedProposal.title}</h1>
              </div>
              <Badge
                variant="light"
                color={
                  selectedProposal.status === 'submitted'
                    ? 'green'
                    : selectedProposal.status === 'withdrawn'
                      ? 'orange'
                      : 'gray'
                }
              >
                {selectedProposal.status}
              </Badge>
            </div>

            <p className={styles.lede}>
              {selectedProposal.summary || 'No proposal summary has been added yet.'}
            </p>

            <div className={styles.proposalEditorActions}>
              {canEdit && selectedProposal.status === 'draft' && (
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
                    onClick={() => onTransitionProposal(selectedProposal, 'submitted')}
                  >
                    Submit proposal
                  </Button>
                </>
              )}

              {canEdit && selectedProposal.status === 'submitted' && (
                <>
                  <Button
                    variant="default"
                    leftSection={<IconArrowBackUp size={16} />}
                    loading={transitionPending}
                    onClick={() => onTransitionProposal(selectedProposal, 'draft')}
                  >
                    Reopen
                  </Button>
                  <Button
                    variant="light"
                    color="orange"
                    leftSection={<IconCircleOff size={16} />}
                    loading={transitionPending}
                    onClick={() => onTransitionProposal(selectedProposal, 'withdrawn')}
                  >
                    Withdraw
                  </Button>
                </>
              )}

              {canEdit && selectedProposal.status === 'withdrawn' && (
                <Button
                  variant="default"
                  leftSection={<IconArrowBackUp size={16} />}
                  loading={transitionPending}
                  onClick={() => onTransitionProposal(selectedProposal, 'draft')}
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
                  'No rationale has been written yet. Reopen this proposal as a draft to add implementation details, tradeoffs, risks, and assumptions.'}
              </p>
            </section>

            <ProposalObjectionsSection
              workspaceId={workspaceId}
              decisionId={decisionId}
              proposal={selectedProposal}
              canEdit={canEdit}
            />

            <footer className={styles.proposalFooter}>
              Updated{' '}
              {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(selectedProposal.updated_at),
              )}
            </footer>
          </article>
        ) : (
          <article className={styles.document}>
          <div className={styles.documentMeta}>DECISION</div>
          <h1>{title}</h1>
          <p className={styles.lede}>{summary || 'No decision summary has been added yet.'}</p>

          <section id="context" className={styles.copySection}>
            <div className={styles.sectionIndex}>01 / CONTEXT</div>
            <h2>Why this needs a decision</h2>
            <p>{summary || 'Add context to explain what the team is deciding and why it matters now.'}</p>
          </section>

          <section id="criteria" className={styles.copySection}>
            <div className={styles.sectionIndex}>02 / CRITERIA</div>
            <h2>What we are optimizing for</h2>
            {criteria.length > 0 ? (
              <ul className={styles.criteriaList}>
                {criteria.map((criterion, index) => (
                  <li key={criterion.id}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{criterion.name}</strong>
                      <p>{criterion.description || `Weight: ${criterion.weight}`}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptySection}>
                <strong>No criteria yet</strong>
                <p>Criteria will appear here once the team defines how proposals should be evaluated.</p>
              </div>
            )}
          </section>

          <section id="proposals" className={styles.copySection}>
            <div className={styles.sectionIndex}>03 / PROPOSALS</div>
            {proposals.length > 0 ? (
              <div className={styles.leadingProposal}>
                <div>
                  <Badge variant="light" color="rust" size="sm">PROPOSALS</Badge>
                  <h3>{proposals.length} alternative{proposals.length === 1 ? '' : 's'} in progress</h3>
                  <p>Select a proposal from the outline to read, edit, submit, or withdraw it.</p>
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

function CollaborationPanel() {
  return (
    <section className={styles.panel} aria-label="Collaboration">
      <Tabs
        defaultValue="discussion"
        classNames={{ root: styles.collaborationTabs, list: styles.collabTabList }}
      >
        <Tabs.List grow>
          <Tabs.Tab value="discussion">Discussion</Tabs.Tab>
          <Tabs.Tab value="evidence">Evidence</Tabs.Tab>
          <Tabs.Tab value="people">People</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="discussion" className={styles.emptyPanel}>
          <strong>No discussion yet</strong>
          <span>Comments and collaborative discussion will appear here.</span>
        </Tabs.Panel>
        <Tabs.Panel value="evidence" className={styles.emptyPanel}>
          <IconFileText size={24} />
          <strong>No evidence loaded yet</strong>
          <span>Evidence will appear here after its API is connected.</span>
        </Tabs.Panel>
        <Tabs.Panel value="people" className={styles.emptyPanel}>
          <IconUsers size={24} />
          <strong>Presence is not connected yet</strong>
          <span>Live participants will appear here once collaboration presence is wired.</span>
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
  const decisionLock = useDecisionLock(
    workspaceId,
    decisionId,
    decision.data?.status === 'locked',
  );
  const transitionProposal = useTransitionProposal(workspaceId, decisionId);
  const deleteProposal = useDeleteProposal(workspaceId, decisionId);
  const desktop = useMediaQuery('(min-width: 80em)');
  const mobileTab = useUiStore((state) => state.mobileDecisionTab);
  const setMobileTab = useUiStore((state) => state.setMobileDecisionTab);
  const leftPanelRef = usePanelRef();
  const rightPanelRef = usePanelRef();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [workMode, setWorkMode] = useState<WorkMode>('document');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [editorProposal, setEditorProposal] = useState<Proposal | null | undefined>(undefined);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'forkroom-decision-room',
    panelIds: ['outline', 'document', 'collaboration'],
    onlySaveAfterUserInteractions: true,
  });

  if (
    currentUser.isPending ||
    workspace.isPending ||
    members.isPending ||
    decision.isPending ||
    proposals.isPending ||
    criteria.isPending ||
    votingSessions.isPending ||
    (decision.data?.status === 'locked' && decisionLock.isPending)
  ) {
    return (
      <div className={styles.roomState}>
        <Loader color="rust" size="sm" />
        <span>Opening decision room…</span>
      </div>
    );
  }

  if (
    workspace.isError ||
    currentUser.isError ||
    members.isError ||
    decision.isError ||
    proposals.isError ||
    criteria.isError ||
    votingSessions.isError ||
    (decision.data?.status === 'locked' && decisionLock.isError) ||
    !currentUser.data ||
    !workspace.data ||
    !members.data ||
    !decision.data ||
    !proposals.data ||
    !criteria.data ||
    !votingSessions.data ||
    (decision.data.status === 'locked' && !decisionLock.data)
  ) {
    return (
      <div className={styles.roomState}>
        <Alert color="red" title="Could not open decision">
          The decision could not be loaded. It may have been removed or you may not have access to it.
        </Alert>
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
  const canContribute = ['owner', 'admin', 'member'].includes(currentMember?.role ?? 'viewer');
  const canManageVoting = ['owner', 'admin'].includes(currentMember?.role ?? 'viewer');
  const hasOpenVotingSession = votingSessions.data.some((session) => session.status === 'open');
  const canEditProposals =
    canContribute &&
    !hasOpenVotingSession &&
    !['closed', 'locked', 'archived'].includes(decision.data.status);

  const selectProposal = (proposal: Proposal) => {
    setSelectedProposalId(proposal.id);
    setWorkMode('proposal');
    if (!desktop) setMobileTab('document');
  };

  const handleTransitionProposal = async (
    proposal: Proposal,
    status: Proposal['status'],
  ) => {
    try {
      const updated = await transitionProposal.mutateAsync({
        proposalId: proposal.id,
        status,
      });
      setSelectedProposalId(updated.id);
      setWorkMode('proposal');
      notifications.show({
        color: 'green',
        title: 'Proposal updated',
        message:
          status === 'submitted'
            ? 'The proposal is ready for team review.'
            : status === 'withdrawn'
              ? 'The proposal has been withdrawn.'
              : 'The proposal is open for editing again.',
      });
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Could not update proposal',
        message: getApiErrorMessage(error, 'ForkRoom could not change this proposal state.'),
      });
    }
  };

  const confirmDeleteProposal = (proposal: Proposal) => {
    modals.openConfirmModal({
      title: 'Delete draft proposal?',
      children: (
        <p className={styles.confirmCopy}>
          “{proposal.title}” will be permanently removed. Submitted proposals must be reopened
          before they can be deleted.
        </p>
      ),
      labels: { confirm: 'Delete proposal', cancel: 'Keep proposal' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteProposal.mutateAsync(proposal.id);
          if (selectedProposal?.id === proposal.id) {
            setSelectedProposalId(null);
            setWorkMode('document');
          }
          notifications.show({
            color: 'green',
            title: 'Draft deleted',
            message: 'The proposal was removed from this decision.',
          });
        } catch (error) {
          notifications.show({
            color: 'red',
            title: 'Could not delete proposal',
            message: getApiErrorMessage(error, 'ForkRoom could not delete this draft proposal.'),
          });
        }
      },
    });
  };

  const togglePanel = (side: 'left' | 'right') => {
    const ref = side === 'left' ? leftPanelRef : rightPanelRef;
    const collapsed = side === 'left' ? leftCollapsed : rightCollapsed;
    if (collapsed) ref.current?.expand();
    else ref.current?.collapse();
  };

  const outline = (
    <OutlinePanel
      workspaceId={workspaceId}
      decisionId={decisionId}
      proposals={proposals.data}
      criteriaCount={criteria.data.length}
      selectedProposalId={selectedProposal?.id ?? null}
      canEdit={canEditProposals}
      transitionPending={transitionProposal.isPending}
      onSelectProposal={selectProposal}
      onCreateProposal={() => setEditorProposal(null)}
      onEditProposal={(proposal) => setEditorProposal(proposal)}
      onTransitionProposal={handleTransitionProposal}
      onDeleteProposal={confirmDeleteProposal}
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
      decisionLock={decisionLock.data ?? null}
      members={members.data}
      isLocked={decision.data.status === 'locked'}
      selectedProposal={selectedProposal}
      mode={workMode}
      canEdit={canEditProposals}
      canManageVoting={canManageVoting}
      canRequestExport={canContribute}
      transitionPending={transitionProposal.isPending}
      onModeChange={setWorkMode}
      onCreateProposal={() => setEditorProposal(null)}
      onEditProposal={(proposal) => setEditorProposal(proposal)}
      onTransitionProposal={handleTransitionProposal}
    />
  );
  const collaboration = <CollaborationPanel />;

  return (
    <div className={styles.room}>
      <header className={styles.roomHeader}>
        <div className={styles.titleBlock}>
          <div className={styles.breadcrumb}>
            {workspace.data.name.toUpperCase()} <IconChevronRight size={12} /> DECISIONS
          </div>
          <div className={styles.titleRow}>
            <h1>{decision.data.title}</h1>
            <Badge
              variant="light"
              color={
                decision.data.status === 'locked'
                  ? 'green'
                  : decision.data.status === 'active'
                    ? 'rust'
                    : 'gray'
              }
              size="sm"
            >
              {decision.data.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className={styles.roomActions}>
          {desktop && (
            <>
              <Tooltip label={leftCollapsed ? 'Show outline' : 'Hide outline'}>
                <ActionIcon
                  variant="subtle"
                  color="dark"
                  onClick={() => togglePanel('left')}
                  aria-label="Toggle decision outline"
                >
                  <IconLayoutSidebarLeftCollapse size={19} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={rightCollapsed ? 'Show collaboration' : 'Hide collaboration'}>
                <ActionIcon
                  variant="subtle"
                  color="dark"
                  onClick={() => togglePanel('right')}
                  aria-label="Toggle collaboration panel"
                >
                  <IconLayoutSidebarRightCollapse size={19} />
                </ActionIcon>
              </Tooltip>
            </>
          )}
          {decision.data.status === 'locked' ? (
            <Tooltip label="View the authoritative decision record">
              <Button
                color="dark"
                leftSection={<IconLock size={17} />}
                onClick={() => {
                  setWorkMode('document');
                  if (!desktop) setMobileTab('document');
                }}
              >
                View locked record
              </Button>
            </Tooltip>
          ) : (
            <Tooltip label="Open voting workspace">
              <Button
                className={styles.voteButton}
                leftSection={<IconScale size={17} />}
                onClick={() => {
                  setWorkMode('vote');
                  if (!desktop) setMobileTab('document');
                }}
              >
                {hasOpenVotingSession ? 'Vote now' : 'Voting'}
              </Button>
            </Tooltip>
          )}
        </div>
      </header>

      <div className={styles.workspace}>
        {desktop ? (
          <Group
            id="decision-room-layout"
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
            <Separator className={styles.resizeHandle} aria-label="Resize decision outline" />
            <Panel id="document" minSize={520} defaultSize="55%">{document}</Panel>
            <Separator className={styles.resizeHandle} aria-label="Resize collaboration panel" />
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
        ) : (
          <div className={styles.responsiveWorkspace}>
            <Tabs value={mobileTab} onChange={(value) => value && setMobileTab(value as typeof mobileTab)}>
              <Tabs.List grow className={styles.responsiveTabs}>
                <Tabs.Tab value="outline">Outline</Tabs.Tab>
                <Tabs.Tab value="document">Document</Tabs.Tab>
                <Tabs.Tab value="discussion">Discussion</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="outline" className={styles.responsivePanel}>{outline}</Tabs.Panel>
              <Tabs.Panel value="document" className={styles.responsivePanel}>{document}</Tabs.Panel>
              <Tabs.Panel value="discussion" className={styles.responsivePanel}>{collaboration}</Tabs.Panel>
            </Tabs>
          </div>
        )}
      </div>

      <div className={styles.mobileVoteDock}>
        <Button
          fullWidth
          color={decision.data.status === 'locked' ? 'dark' : 'rust'}
          leftSection={
            decision.data.status === 'locked' ? (
              <IconLock size={18} />
            ) : (
              <IconScale size={18} />
            )
          }
          onClick={() => {
            setWorkMode(decision.data.status === 'locked' ? 'document' : 'vote');
            setMobileTab('document');
          }}
        >
          {decision.data.status === 'locked'
            ? 'View locked record'
            : hasOpenVotingSession
              ? 'Vote now'
              : 'Open voting'}
        </Button>
      </div>

      <ProposalEditorModal
        workspaceId={workspaceId}
        decisionId={decisionId}
        proposal={editorProposal ?? null}
        opened={editorProposal !== undefined}
        onClose={() => setEditorProposal(undefined)}
        onSaved={(proposal) => {
          setSelectedProposalId(proposal.id);
          setWorkMode('proposal');
          if (!desktop) setMobileTab('document');
          notifications.show({
            color: 'green',
            title: editorProposal ? 'Proposal saved' : 'Proposal created',
            message: 'The proposal is available in the decision outline.',
          });
        }}
      />
    </div>
  );
}
