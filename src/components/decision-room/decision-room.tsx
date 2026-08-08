'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Loader,
  ScrollArea,
  Tabs,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconChevronRight,
  IconFileText,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
  IconPlus,
  IconScale,
  IconUsers,
} from '@tabler/icons-react';
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  usePanelRef,
} from 'react-resizable-panels';

import {
  useDecision,
  useDecisionCriteria,
  useDecisionProposals,
  useWorkspace,
} from '@/hooks/use-workspaces';
import type { Criterion, Proposal } from '@/services/workspace.service';
import { useUiStore } from '@/stores/use-ui-store';

import styles from './decision-room.module.css';

function OutlinePanel({
  proposals,
  criteriaCount,
}: {
  proposals: Proposal[];
  criteriaCount: number;
}) {
  return (
    <section className={styles.panel} aria-label="Decision outline">
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.kicker}>OUTLINE</span>
          <h2>Decision context</h2>
        </div>
        <Tooltip label="Proposal creation will be connected next">
          <ActionIcon variant="subtle" color="dark" aria-label="Add proposal">
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
                className={`${styles.proposal} ${index === 0 ? styles.proposalSelected : ''}`}
              >
                <span className={styles.proposalNumber}>{String(index + 1).padStart(2, '0')}</span>
                <strong>{proposal.title}</strong>
                <small>{proposal.summary || proposal.status}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptySection}>
            <strong>No proposals yet</strong>
            <p>Add an alternative that the team can compare, challenge, and vote on.</p>
            <Button size="xs" variant="light" color="rust" leftSection={<IconPlus size={14} />}>
              Add proposal
            </Button>
          </div>
        )}
      </ScrollArea>
    </section>
  );
}

function DocumentPanel({
  title,
  summary,
  criteria,
  proposals,
}: {
  title: string;
  summary: string | null;
  criteria: Criterion[];
  proposals: Proposal[];
}) {
  const leadingProposal = proposals[0];

  return (
    <section className={`${styles.panel} ${styles.documentPanel}`} aria-label="Decision document">
      <div className={styles.documentToolbar}>
        <Tabs
          defaultValue="document"
          variant="unstyled"
          classNames={{ list: styles.modeTabs, tab: styles.modeTab }}
        >
          <Tabs.List aria-label="Decision work mode">
            <Tabs.Tab value="document">Document</Tabs.Tab>
            <Tabs.Tab value="compare">Compare</Tabs.Tab>
            <Tabs.Tab value="vote">Vote</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </div>

      <ScrollArea className={styles.documentScroll} type="auto">
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
            {leadingProposal ? (
              <div className={styles.leadingProposal}>
                <div>
                  <Badge variant="light" color="rust" size="sm">PROPOSAL</Badge>
                  <h3>{leadingProposal.title}</h3>
                  <p>{leadingProposal.summary || 'No proposal summary has been added yet.'}</p>
                </div>
              </div>
            ) : (
              <div className={styles.emptySection}>
                <strong>No proposals yet</strong>
                <p>Alternatives will appear here as the team adds them.</p>
              </div>
            )}
          </section>
        </article>
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
  const workspace = useWorkspace(workspaceId);
  const decision = useDecision(workspaceId, decisionId);
  const proposals = useDecisionProposals(workspaceId, decisionId);
  const criteria = useDecisionCriteria(workspaceId, decisionId);
  const desktop = useMediaQuery('(min-width: 80em)');
  const mobileTab = useUiStore((state) => state.mobileDecisionTab);
  const setMobileTab = useUiStore((state) => state.setMobileDecisionTab);
  const leftPanelRef = usePanelRef();
  const rightPanelRef = usePanelRef();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'forkroom-decision-room',
    panelIds: ['outline', 'document', 'collaboration'],
    onlySaveAfterUserInteractions: true,
  });

  if (workspace.isPending || decision.isPending || proposals.isPending || criteria.isPending) {
    return (
      <div className={styles.roomState}>
        <Loader color="rust" size="sm" />
        <span>Opening decision room…</span>
      </div>
    );
  }

  if (
    workspace.isError ||
    decision.isError ||
    proposals.isError ||
    criteria.isError ||
    !workspace.data ||
    !decision.data ||
    !proposals.data ||
    !criteria.data
  ) {
    return (
      <div className={styles.roomState}>
        <Alert color="red" title="Could not open decision">
          The decision could not be loaded. It may have been removed or you may not have access to it.
        </Alert>
      </div>
    );
  }

  const togglePanel = (side: 'left' | 'right') => {
    const ref = side === 'left' ? leftPanelRef : rightPanelRef;
    const collapsed = side === 'left' ? leftCollapsed : rightCollapsed;
    if (collapsed) ref.current?.expand();
    else ref.current?.collapse();
  };

  const outline = <OutlinePanel proposals={proposals.data} criteriaCount={criteria.data.length} />;
  const document = (
    <DocumentPanel
      title={decision.data.title}
      summary={decision.data.summary}
      criteria={criteria.data}
      proposals={proposals.data}
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
          <Button className={styles.voteButton} leftSection={<IconScale size={17} />}>Vote</Button>
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
        <Button fullWidth leftSection={<IconScale size={18} />}>Vote on this decision</Button>
      </div>
    </div>
  );
}
