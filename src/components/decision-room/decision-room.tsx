"use client";

import { useState } from "react";
import {
  ActionIcon,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Menu,
  Progress,
  ScrollArea,
  Tabs,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconCheck,
  IconChevronRight,
  IconDots,
  IconFileText,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
  IconLink,
  IconPaperclip,
  IconPlus,
  IconScale,
  IconSend,
  IconUsers,
} from "@tabler/icons-react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  usePanelRef,
} from "react-resizable-panels";
import { useUiStore } from "@/stores/use-ui-store";
import styles from "./decision-room.module.css";

const proposals = [
  {
    id: "01",
    title: "Short-lived JWT access tokens",
    meta: "Raman · 4 objections",
    selected: true,
  },
  { id: "02", title: "Server-side sessions", meta: "Priya · 2 objections" },
  {
    id: "03",
    title: "Hybrid token + session model",
    meta: "Arjun · 1 objection",
  },
];

const comments = [
  {
    initials: "PS",
    name: "Priya Sharma",
    time: "12 min",
    body: "The 15-minute access token window is a good default. I want refresh-token reuse detection called out in the final rationale.",
  },
  {
    initials: "AK",
    name: "Arjun Kapoor",
    time: "7 min",
    body: "Agreed. We should also preserve the reason we rejected long-lived browser tokens so this does not get reopened without context.",
  },
];

function OutlinePanel() {
  return (
    <section className={styles.panel} aria-label="Decision outline">
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.kicker}>OUTLINE</span>
          <h2>Decision context</h2>
        </div>
        <Tooltip label="Add proposal">
          <ActionIcon variant="subtle" color="dark" aria-label="Add proposal">
            <IconPlus size={18} stroke={1.8} />
          </ActionIcon>
        </Tooltip>
      </div>
      <ScrollArea className={styles.panelScroll} type="auto">
        <nav className={styles.outlineNav} aria-label="Decision sections">
          <a href="#context" className={styles.outlineLinkActive}>
            Context
          </a>
          <a href="#criteria">
            Criteria <span>4</span>
          </a>
          <a href="#evidence">
            Evidence <span>7</span>
          </a>
          <a href="#objections">
            Objections <span className={styles.warningCount}>3</span>
          </a>
        </nav>

        <div className={styles.sectionHeading}>
          <span>PROPOSALS</span>
          <span>3</span>
        </div>
        <div className={styles.proposalList}>
          {proposals.map((proposal) => (
            <button
              key={proposal.id}
              className={`${styles.proposal} ${proposal.selected ? styles.proposalSelected : ""}`}
              type="button"
            >
              <span className={styles.proposalNumber}>{proposal.id}</span>
              <strong>{proposal.title}</strong>
              <small>{proposal.meta}</small>
            </button>
          ))}
        </div>

        <div className={styles.sectionHeading}>
          <span>READINESS</span>
          <span>68%</span>
        </div>
        <div className={styles.readiness}>
          <Progress
            value={68}
            color="rust"
            size="sm"
            aria-label="Decision readiness 68 percent"
          />
          <p>
            <IconAlertTriangle size={15} /> 3 unresolved objections before lock
          </p>
        </div>
      </ScrollArea>
    </section>
  );
}

function DocumentPanel() {
  return (
    <section
      className={`${styles.panel} ${styles.documentPanel}`}
      aria-label="Decision document"
    >
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
        <div className={styles.savedState}>
          <IconCheck size={15} /> Saved
        </div>
      </div>

      <ScrollArea className={styles.documentScroll} type="auto">
        <article className={styles.document}>
          <div className={styles.documentMeta}>DECISION DRAFT · REV 08</div>
          <h1>Authentication strategy</h1>
          <p className={styles.lede}>
            Choose the authentication model for ForkRoom&apos;s public API and
            browser clients while keeping revocation and multi-device sessions
            manageable.
          </p>

          <div className={styles.statusNote} role="note">
            <IconAlertTriangle size={18} stroke={1.8} />
            <div>
              <strong>3 objections remain open</strong>
              <span>
                Resolve or explicitly accept them before this decision can be
                locked.
              </span>
            </div>
          </div>

          <section id="context" className={styles.copySection}>
            <div className={styles.sectionIndex}>01 / CONTEXT</div>
            <h2>Why this needs a decision</h2>
            <p>
              ForkRoom needs short-lived browser authentication without making
              every API request depend on a database session lookup. The model
              must also support explicit logout, token-family revocation, and
              safe recovery when a refresh token is reused.
            </p>
          </section>

          <section id="criteria" className={styles.copySection}>
            <div className={styles.sectionIndex}>02 / CRITERIA</div>
            <h2>What we are optimizing for</h2>
            <ul className={styles.criteriaList}>
              <li>
                <span>01</span>
                <div>
                  <strong>Revocation</strong>
                  <p>
                    Compromised sessions can be invalidated without waiting for
                    a long token expiry.
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Latency</strong>
                  <p>
                    Normal authenticated requests should avoid a database round
                    trip for session validation.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Recovery</strong>
                  <p>
                    Refresh-token reuse has a clear, auditable response that
                    protects the entire token family.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <section className={styles.copySection}>
            <div className={styles.sectionIndex}>03 / LEADING PROPOSAL</div>
            <div className={styles.leadingProposal}>
              <div>
                <Badge variant="light" color="rust" size="sm">
                  LEADING
                </Badge>
                <h3>Short-lived JWT access tokens</h3>
                <p>
                  15-minute access tokens paired with rotating refresh tokens
                  and token-family reuse detection.
                </p>
              </div>
              <Button
                variant="subtle"
                color="dark"
                rightSection={<IconArrowUpRight size={16} />}
              >
                Open proposal
              </Button>
            </div>
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
        classNames={{
          root: styles.collaborationTabs,
          list: styles.collabTabList,
        }}
      >
        <Tabs.List grow>
          <Tabs.Tab value="discussion">
            Discussion <span className={styles.tabCount}>24</span>
          </Tabs.Tab>
          <Tabs.Tab value="evidence">
            Evidence <span className={styles.tabCount}>7</span>
          </Tabs.Tab>
          <Tabs.Tab value="people">People</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="discussion" className={styles.collaborationBody}>
          <ScrollArea className={styles.commentScroll} type="auto">
            <div className={styles.threadMeta}>
              <span>OPEN THREAD</span>
              <span>Context · line 18</span>
            </div>
            {comments.map((comment) => (
              <article key={comment.name} className={styles.comment}>
                <Avatar color="rust" variant="light" size={30} radius="xl">
                  {comment.initials}
                </Avatar>
                <div>
                  <header>
                    <strong>{comment.name}</strong>
                    <time>{comment.time}</time>
                  </header>
                  <p>{comment.body}</p>
                  <button type="button">Reply</button>
                </div>
              </article>
            ))}
          </ScrollArea>
          <div className={styles.commentComposer}>
            <Textarea
              autosize
              minRows={2}
              maxRows={5}
              placeholder="Add to the discussion…"
              aria-label="Add a comment"
            />
            <div className={styles.composerActions}>
              <ActionIcon
                variant="subtle"
                color="dark"
                aria-label="Attach evidence"
              >
                <IconPaperclip size={18} />
              </ActionIcon>
              <Button size="xs" rightSection={<IconSend size={15} />}>
                Comment
              </Button>
            </div>
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="evidence" className={styles.emptyPanel}>
          <IconFileText size={24} />
          <strong>7 evidence items</strong>
          <span>Sources and attachments stay connected to this decision.</span>
        </Tabs.Panel>
        <Tabs.Panel value="people" className={styles.emptyPanel}>
          <IconUsers size={24} />
          <strong>4 people here now</strong>
          <span>12 members can participate in this decision.</span>
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}

export function DecisionRoom() {
  const desktop = useMediaQuery("(min-width: 80em)");
  const mobileTab = useUiStore((state) => state.mobileDecisionTab);
  const setMobileTab = useUiStore((state) => state.setMobileDecisionTab);
  const leftPanelRef = usePanelRef();
  const rightPanelRef = usePanelRef();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "forkroom-decision-room",
    panelIds: ["outline", "document", "collaboration"],
    onlySaveAfterUserInteractions: true,
  });

  const togglePanel = (side: "left" | "right") => {
    const ref = side === "left" ? leftPanelRef : rightPanelRef;
    const collapsed = side === "left" ? leftCollapsed : rightCollapsed;
    if (collapsed) ref.current?.expand();
    else ref.current?.collapse();
  };

  return (
    <div className={styles.room}>
      <header className={styles.roomHeader}>
        <div className={styles.titleBlock}>
          <div className={styles.breadcrumb}>
            NEXUS ENGINEERING <IconChevronRight size={12} /> DECISIONS
          </div>
          <div className={styles.titleRow}>
            <h1>Authentication strategy</h1>
            <Badge variant="light" color="orange" size="sm">
              IN REVIEW
            </Badge>
          </div>
        </div>

        <div className={styles.roomActions}>
          <div className={styles.syncState}>
            <span /> SYNCED
          </div>
          <AvatarGroup className={styles.avatarGroup}>
            <Avatar size={30} color="rust">
              RS
            </Avatar>
            <Avatar size={30} color="blue">
              PS
            </Avatar>
            <Avatar size={30} color="teal">
              AK
            </Avatar>
            <Avatar size={30} color="gray">
              +1
            </Avatar>
          </AvatarGroup>
          {desktop && (
            <>
              <Tooltip label={leftCollapsed ? "Show outline" : "Hide outline"}>
                <ActionIcon
                  variant="subtle"
                  color="dark"
                  onClick={() => togglePanel("left")}
                  aria-label="Toggle decision outline"
                >
                  <IconLayoutSidebarLeftCollapse size={19} />
                </ActionIcon>
              </Tooltip>
              <Tooltip
                label={
                  rightCollapsed ? "Show collaboration" : "Hide collaboration"
                }
              >
                <ActionIcon
                  variant="subtle"
                  color="dark"
                  onClick={() => togglePanel("right")}
                  aria-label="Toggle collaboration panel"
                >
                  <IconLayoutSidebarRightCollapse size={19} />
                </ActionIcon>
              </Tooltip>
            </>
          )}
          <Button
            className={styles.voteButton}
            leftSection={<IconScale size={17} />}
          >
            Vote
          </Button>
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="dark"
                size={36}
                aria-label="More decision actions"
              >
                <IconDots size={20} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconLink size={16} />}>
                Copy decision link
              </Menu.Item>
              <Menu.Item leftSection={<IconFileText size={16} />}>
                View revision history
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
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
              <OutlinePanel />
            </Panel>
            <Separator
              className={styles.resizeHandle}
              aria-label="Resize decision outline"
            />
            <Panel id="document" minSize={520} defaultSize="55%">
              <DocumentPanel />
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
              <CollaborationPanel />
            </Panel>
          </Group>
        ) : (
          <div className={styles.responsiveWorkspace}>
            <Tabs
              value={mobileTab}
              onChange={(value) =>
                value && setMobileTab(value as typeof mobileTab)
              }
              classNames={{
                list: styles.responsiveTabs,
                tab: styles.responsiveTab,
              }}
            >
              <Tabs.List grow>
                <Tabs.Tab value="outline">Outline</Tabs.Tab>
                <Tabs.Tab value="document">Document</Tabs.Tab>
                <Tabs.Tab
                  value="discussion"
                  rightSection={<span className={styles.unreadDot} />}
                >
                  Discussion
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="outline" className={styles.responsivePanel}>
                <OutlinePanel />
              </Tabs.Panel>
              <Tabs.Panel value="document" className={styles.responsivePanel}>
                <DocumentPanel />
              </Tabs.Panel>
              <Tabs.Panel value="discussion" className={styles.responsivePanel}>
                <CollaborationPanel />
              </Tabs.Panel>
            </Tabs>
          </div>
        )}
      </div>

      <div className={styles.mobileVoteDock}>
        <Button fullWidth leftSection={<IconScale size={18} />}>
          Vote on this decision
        </Button>
      </div>
    </div>
  );
}
