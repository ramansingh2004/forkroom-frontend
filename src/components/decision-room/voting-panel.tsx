"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Progress,
  Radio,
  Select,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconBan,
  IconCheck,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconScale,
  IconSquareCheck,
} from "@tabler/icons-react";

import {
  useCancelVotingSession,
  useCastVote,
  useCloseVotingSession,
  useDecisionOpenObjections,
  useOpenVotingSession,
  useVotingResult,
} from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import type {
  DecisionStatus,
  Proposal,
  Vote,
  VotingSession,
} from "@/services/workspace.service";

import styles from "./decision-room.module.css";
import {
  type VotingReadiness,
  VotingReadinessPanel,
} from "./decision-lifecycle";
import { DecisionLockModal } from "./decision-lock-modal";
import { VotingSessionModal } from "./voting-session-modal";

export type VotingPanelAction =
  | "create-round"
  | "open-voting"
  | "cast-vote"
  | "close-voting"
  | "lock-decision"
  | "review-result";

export type VotingPanelActionRequest = {
  id: number;
  action: VotingPanelAction;
};

type VotingPanelProps = {
  workspaceId: string;
  decisionId: string;
  decisionStatus: DecisionStatus;
  proposals: Proposal[];
  sessions: VotingSession[];
  canManageVoting: boolean;
  readiness: VotingReadiness;
  actionRequest: VotingPanelActionRequest | null;
  onActionHandled: (requestId: number) => void;
};

const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "No automatic close time";

const statusColor = (status: VotingSession["status"]) => {
  if (status === "open") return "green";
  if (status === "closed") return "blue";
  if (status === "cancelled") return "gray";
  return "orange";
};

export function VotingPanel({
  workspaceId,
  decisionId,
  decisionStatus,
  proposals,
  sessions,
  canManageVoting,
  readiness,
  actionRequest,
  onActionHandled,
}: VotingPanelProps) {
  const orderedSessions = [...sessions].sort(
    (left, right) =>
      new Date(right.created_at).getTime() -
      new Date(left.created_at).getTime(),
  );
  const unfinishedSession = orderedSessions.find(
    (session) => session.status === "draft" || session.status === "open",
  );
  const canCreateRound =
    canManageVoting && decisionStatus === "active" && !unfinishedSession;
  const roundCreationReason =
    decisionStatus === "draft"
      ? "Activate the decision before creating a voting round."
      : decisionStatus !== "active"
        ? `Voting rounds cannot be created while the decision is ${decisionStatus}.`
        : unfinishedSession
          ? `Finish or cancel the existing ${unfinishedSession.status} round first.`
          : null;
  const preferredSession =
    orderedSessions.find((session) => session.status === "open") ??
    orderedSessions.find((session) => session.status === "draft") ??
    orderedSessions[0] ??
    null;
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [createOpened, setCreateOpened] = useState(false);
  const [lockOpened, setLockOpened] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [recordedVote, setRecordedVote] = useState<Vote | null>(null);
  const selectedSession =
    orderedSessions.find((session) => session.id === selectedSessionId) ??
    preferredSession;
  const submittedProposals = proposals.filter(
    (proposal) => proposal.status === "submitted",
  );
  const openObjections = useDecisionOpenObjections(
    workspaceId,
    decisionId,
    selectedSession?.status === "closed"
      ? submittedProposals.map((proposal) => proposal.id)
      : [],
  );
  const openSession = useOpenVotingSession(workspaceId, decisionId);
  const closeSession = useCloseVotingSession(workspaceId, decisionId);
  const cancelSession = useCancelVotingSession(workspaceId, decisionId);
  const castVote = useCastVote(
    workspaceId,
    decisionId,
    selectedSession?.id ?? "",
  );
  const result = useVotingResult(
    workspaceId,
    decisionId,
    selectedSession?.id,
    selectedSession?.status === "closed",
  );
  const proposalById = new Map(
    proposals.map((proposal) => [proposal.id, proposal]),
  );
  const winningProposal = result.data?.winner_proposal_id
    ? (proposalById.get(result.data.winner_proposal_id) ?? null)
    : null;
  const canLockResult = Boolean(
    result.data?.result_valid &&
    !result.data.is_tie &&
    result.data.winner_proposal_id &&
    winningProposal,
  );
  const readinessBlocked = readiness.isChecking || readiness.issues.length > 0;
  const actionError =
    openSession.error ?? closeSession.error ?? cancelSession.error;

  const confirmOpen = () => {
    if (!selectedSession) return;
    modals.openConfirmModal({
      title: "Open this voting round?",
      children: (
        <p className={styles.confirmCopy}>
          Eligible members will be able to vote for one submitted proposal.
          Proposal structure should remain unchanged until the round closes.
        </p>
      ),
      labels: { confirm: "Open voting", cancel: "Keep draft" },
      confirmProps: { color: "rust" },
      onConfirm: async () => {
        try {
          await openSession.mutateAsync(selectedSession.id);
          notifications.show({
            color: "green",
            title: "Voting opened",
            message: "Eligible members can now submit their ballots.",
          });
        } catch {
          // The page-level alert presents the backend error.
        }
      },
    });
  };

  const confirmClose = () => {
    if (!selectedSession) return;
    modals.openConfirmModal({
      title: "Close voting and calculate the result?",
      children: (
        <p className={styles.confirmCopy}>
          No more ballots can be submitted after this round closes. ForkRoom
          will calculate quorum, tallies, ties, and the winning proposal from
          the recorded votes.
        </p>
      ),
      labels: { confirm: "Close voting", cancel: "Keep open" },
      confirmProps: { color: "dark" },
      onConfirm: async () => {
        try {
          await closeSession.mutateAsync(selectedSession.id);
          notifications.show({
            color: "green",
            title: "Voting closed",
            message: "The final round result is now available.",
          });
        } catch {
          // The page-level alert presents the backend error.
        }
      },
    });
  };

  const confirmCancel = () => {
    if (!selectedSession) return;
    modals.openConfirmModal({
      title: "Cancel this voting round?",
      children: (
        <p className={styles.confirmCopy}>
          The round will remain in voting history as cancelled and cannot be
          reopened.
        </p>
      ),
      labels: { confirm: "Cancel round", cancel: "Keep round" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await cancelSession.mutateAsync(selectedSession.id);
          notifications.show({
            color: "orange",
            title: "Voting cancelled",
            message: "The cancelled round remains available in history.",
          });
        } catch {
          // The page-level alert presents the backend error.
        }
      },
    });
  };

  const confirmVote = () => {
    if (!selectedSession || !selectedProposalId) return;
    const proposal = proposalById.get(selectedProposalId);
    modals.openConfirmModal({
      title: recordedVote ? "Update your vote?" : "Submit your vote?",
      children: (
        <p className={styles.confirmCopy}>
          Your ballot will select{" "}
          <strong>{proposal?.title ?? "this proposal"}</strong>. The backend
          will confirm your eligibility and whether this round permits a changed
          vote.
        </p>
      ),
      labels: {
        confirm: recordedVote ? "Update vote" : "Submit vote",
        cancel: "Review options",
      },
      confirmProps: { color: "rust" },
      onConfirm: async () => {
        try {
          const vote = await castVote.mutateAsync({
            proposal_id: selectedProposalId,
          });
          setRecordedVote(vote);
          notifications.show({
            color: "green",
            title: "Vote recorded",
            message:
              "Your ballot was recorded. This does not lock the decision.",
          });
        } catch {
          // The inline alert presents the backend error.
        }
      },
    });
  };

  useEffect(() => {
    if (!actionRequest) return;
    onActionHandled(actionRequest.id);

    if (actionRequest.action === "create-round") {
      setCreateOpened(true);
      return;
    }

    if (actionRequest.action === "open-voting") {
      if (selectedSession?.status === "draft" && !readinessBlocked) {
        confirmOpen();
      }
      return;
    }

    if (actionRequest.action === "close-voting") {
      if (selectedSession?.status === "open") confirmClose();
      return;
    }

    if (actionRequest.action === "lock-decision") {
      if (selectedSession?.status === "closed" && canLockResult) {
        setLockOpened(true);
      } else {
        document
          .getElementById("closed-voting-result")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    const targetId =
      actionRequest.action === "cast-vote"
        ? "decision-ballot"
        : "closed-voting-result";
    window.requestAnimationFrame(() => {
      document
        .getElementById(targetId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    // Each request has a monotonic id, so it is handled exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionRequest?.id]);

  return (
    <article className={`${styles.document} ${styles.votingDocument}`}>
      <div className={styles.votingHeading}>
        <div>
          <span className={styles.documentMeta}>COMMITMENT / VOTING</span>
          <h1>Choose an informed outcome</h1>
          <p className={styles.lede}>
            Review the rules and submitted alternatives before recording one
            ballot.
          </p>
        </div>
        {canManageVoting && (
          <div title={roundCreationReason ?? undefined}>
            <Button
              color="rust"
              leftSection={<IconPlus size={16} />}
              onClick={() => setCreateOpened(true)}
              disabled={!canCreateRound}
            >
              New round
            </Button>
          </div>
        )}
      </div>

      {canManageVoting && roundCreationReason && (
        <Alert color="orange" title="A new voting round is not available">
          {roundCreationReason}
        </Alert>
      )}

      {(!selectedSession ||
        selectedSession.status === "draft" ||
        selectedSession.status === "open") && (
        <VotingReadinessPanel readiness={readiness} />
      )}

      {orderedSessions.length === 0 || !selectedSession ? (
        <div className={styles.votingEmpty}>
          <IconScale size={28} />
          <strong>No voting round yet</strong>
          <p>
            A facilitator can create a draft round after the team submits at
            least one proposal and addresses blocking objections.
          </p>
          {canManageVoting && (
            <Button
              color="rust"
              onClick={() => setCreateOpened(true)}
              disabled={!canCreateRound}
            >
              Create voting round
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className={styles.votingRoundBar}>
            <Select
              label="Voting round"
              data={orderedSessions.map((session, index) => ({
                value: session.id,
                label: `Round ${orderedSessions.length - index} · ${session.status}`,
              }))}
              value={selectedSession.id}
              onChange={(value) => {
                setSelectedSessionId(value);
                setSelectedProposalId("");
                setRecordedVote(null);
              }}
              allowDeselect={false}
            />
            <Badge
              variant="light"
              color={statusColor(selectedSession.status)}
              size="lg"
            >
              {selectedSession.status}
            </Badge>
          </div>

          <div className={styles.votingMetrics}>
            <div>
              <span>ELIGIBLE VOTERS</span>
              <strong>{selectedSession.eligible_voter_count}</strong>
            </div>
            <div>
              <span>QUORUM</span>
              <strong>{selectedSession.quorum_percentage}%</strong>
            </div>
            <div>
              <span>CLOSES</span>
              <strong>{formatDateTime(selectedSession.closes_at)}</strong>
            </div>
          </div>

          {actionError && (
            <Alert color="red" title="Could not change voting state">
              {getApiErrorMessage(
                actionError,
                "ForkRoom rejected this voting-session transition.",
              )}
            </Alert>
          )}

          {selectedSession.status === "draft" && (
            <section id="decision-ballot" className={styles.votingStage}>
              <div className={styles.sectionIndex}>01 / READINESS</div>
              <h2>Review before opening</h2>
              <p>
                {submittedProposals.length} submitted proposal
                {submittedProposals.length === 1 ? "" : "s"} will be shown on
                the ballot. The server snapshots eligibility when the round
                opens.
              </p>
              {submittedProposals.length === 0 && (
                <Alert color="orange" title="No submitted proposals">
                  Submit at least one proposal before opening this round.
                </Alert>
              )}
              {canManageVoting ? (
                <Group>
                  <Button
                    color="rust"
                    leftSection={<IconLockOpen size={16} />}
                    onClick={confirmOpen}
                    disabled={readinessBlocked}
                    loading={openSession.isPending}
                  >
                    Open voting
                  </Button>
                  <Button
                    variant="light"
                    color="red"
                    leftSection={<IconBan size={16} />}
                    onClick={confirmCancel}
                    loading={cancelSession.isPending}
                  >
                    Cancel round
                  </Button>
                </Group>
              ) : (
                <Alert color="gray" title="Waiting for a facilitator">
                  Only a workspace owner or administrator can open or cancel
                  this round.
                </Alert>
              )}
            </section>
          )}

          {selectedSession.status === "open" && (
            <section id="closed-voting-result" className={styles.votingStage}>
              <div className={styles.sectionIndex}>01 / YOUR BALLOT</div>
              <h2>Select one proposal</h2>
              <p>
                Eligibility is checked by the server when you submit. Live
                participation totals are not exposed by the current API and are
                therefore not estimated here.
              </p>

              <Radio.Group
                value={selectedProposalId}
                onChange={setSelectedProposalId}
                aria-label="Submitted proposals"
              >
                <div className={styles.ballotOptions}>
                  {submittedProposals.map((proposal, index) => (
                    <label
                      key={proposal.id}
                      className={`${styles.ballotOption} ${
                        selectedProposalId === proposal.id
                          ? styles.ballotOptionSelected
                          : ""
                      }`}
                    >
                      <Radio value={proposal.id} />
                      <span className={styles.ballotNumber}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <strong>{proposal.title}</strong>
                        <small>
                          {proposal.summary || "No summary provided."}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </Radio.Group>

              {recordedVote && (
                <Alert
                  color="green"
                  icon={<IconSquareCheck size={18} />}
                  title="Vote recorded"
                >
                  Your current in-session confirmation is{" "}
                  <strong>
                    {proposalById.get(recordedVote.proposal_id)?.title}
                  </strong>
                  . A recorded vote is not the same as a locked decision.
                </Alert>
              )}

              {castVote.error && (
                <Alert color="red" title="Vote was not recorded">
                  {getApiErrorMessage(
                    castVote.error,
                    "ForkRoom could not record this ballot. Check your eligibility and try again.",
                  )}
                </Alert>
              )}

              <Group justify="space-between" className={styles.voteActions}>
                <span>
                  Your recorded ballot cannot be restored after reload until the
                  API exposes a current-user vote endpoint.
                </span>
                <Button
                  color="rust"
                  leftSection={<IconCheck size={16} />}
                  onClick={confirmVote}
                  disabled={!selectedProposalId || readinessBlocked}
                  loading={castVote.isPending}
                >
                  {recordedVote ? "Update vote" : "Submit vote"}
                </Button>
              </Group>

              {canManageVoting && (
                <Group className={styles.facilitatorActions}>
                  <Button
                    color="dark"
                    onClick={confirmClose}
                    loading={closeSession.isPending}
                  >
                    Close and calculate result
                  </Button>
                  <Button
                    variant="light"
                    color="red"
                    onClick={confirmCancel}
                    loading={cancelSession.isPending}
                  >
                    Cancel round
                  </Button>
                </Group>
              )}
            </section>
          )}

          {selectedSession.status === "closed" && (
            <section className={styles.votingStage}>
              <div className={styles.sectionIndex}>01 / RESULT</div>
              <h2>Closed voting result</h2>

              {result.isPending && (
                <div className={styles.voteReadinessState}>
                  <Loader color="rust" size="xs" /> Calculating result…
                </div>
              )}

              {result.isError && (
                <Alert color="red" title="Could not load the result">
                  {getApiErrorMessage(
                    result.error,
                    "ForkRoom could not load this round result.",
                  )}
                </Alert>
              )}

              {result.data && (
                <>
                  <div className={styles.resultSummary}>
                    <div>
                      <span>PARTICIPATION</span>
                      <strong>
                        {result.data.votes_cast} /{" "}
                        {result.data.eligible_voter_count}
                      </strong>
                    </div>
                    <div>
                      <span>REQUIRED</span>
                      <strong>{result.data.required_votes}</strong>
                    </div>
                    <div>
                      <span>QUORUM</span>
                      <strong>
                        {result.data.quorum_met ? "Met" : "Not met"}
                      </strong>
                    </div>
                  </div>

                  <Progress
                    value={
                      result.data.eligible_voter_count > 0
                        ? (result.data.votes_cast /
                            result.data.eligible_voter_count) *
                          100
                        : 0
                    }
                    color={result.data.quorum_met ? "green" : "orange"}
                    size="lg"
                    radius="xl"
                    aria-label="Voting participation"
                  />

                  <Alert
                    color={result.data.result_valid ? "green" : "orange"}
                    title={
                      result.data.result_valid
                        ? result.data.is_tie
                          ? "Valid result, but the vote is tied"
                          : "Valid voting result"
                        : "Result is not valid"
                    }
                  >
                    {result.data.result_valid
                      ? result.data.is_tie
                        ? "A facilitator must resolve the tie before the decision can be locked."
                        : `Winning proposal: ${
                            proposalById.get(
                              result.data.winner_proposal_id ?? "",
                            )?.title ?? "Unknown proposal"
                          }. The decision is not locked yet.`
                      : "Quorum was not met, so this result cannot be used to lock the decision."}
                  </Alert>

                  <div className={styles.resultTallies}>
                    {[...result.data.tallies]
                      .sort((left, right) => right.votes - left.votes)
                      .map((tally) => (
                        <div
                          key={tally.proposal_id}
                          className={styles.resultTally}
                        >
                          <div>
                            <strong>
                              {proposalById.get(tally.proposal_id)?.title ??
                                "Unknown proposal"}
                            </strong>
                            <span>{tally.votes} votes</span>
                          </div>
                          <Progress value={tally.percentage} color="rust" />
                          <strong>{tally.percentage.toFixed(1)}%</strong>
                        </div>
                      ))}
                  </div>

                  {canLockResult && (
                    <div className={styles.lockDecisionCallout}>
                      <div>
                        <span className={styles.kicker}>FINAL COMMITMENT</span>
                        <h3>Preserve this result as the decision</h3>
                        <p>
                          Locking creates an immutable snapshot of the selected
                          proposal, voting result, objections, and decision
                          context.
                        </p>
                      </div>

                      {openObjections.isPending && (
                        <div className={styles.voteReadinessState}>
                          <Loader color="rust" size="xs" /> Checking unresolved
                          objections…
                        </div>
                      )}

                      {openObjections.isError && (
                        <Alert
                          color="red"
                          title="Lock readiness could not be verified"
                        >
                          ForkRoom could not load all unresolved objections. The
                          lock action remains disabled until this check
                          succeeds.
                        </Alert>
                      )}

                      {canManageVoting ? (
                        <Button
                          color="dark"
                          leftSection={<IconLock size={16} />}
                          onClick={() => setLockOpened(true)}
                          disabled={
                            openObjections.isPending || openObjections.isError
                          }
                        >
                          Lock decision
                        </Button>
                      ) : (
                        <Alert
                          color="gray"
                          title="Waiting for an administrator"
                        >
                          The result is valid. A workspace owner or
                          administrator must confirm and lock the decision.
                        </Alert>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {selectedSession.status === "cancelled" && (
            <div className={styles.votingEmpty}>
              <IconBan size={27} />
              <strong>This voting round was cancelled</strong>
              <p>
                It remains in the decision record for traceability. Select
                another historical round or create a new draft round.
              </p>
            </div>
          )}
        </>
      )}

      <VotingSessionModal
        workspaceId={workspaceId}
        decisionId={decisionId}
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        onCreated={(session) => {
          setSelectedSessionId(session.id);
          notifications.show({
            color: "green",
            title: "Draft voting round created",
            message: "Review readiness before opening the round.",
          });
        }}
      />

      {selectedSession && result.data && winningProposal && (
        <DecisionLockModal
          workspaceId={workspaceId}
          decisionId={decisionId}
          session={selectedSession}
          result={result.data}
          winner={winningProposal}
          openObjectionCount={openObjections.objections.length}
          opened={lockOpened}
          onClose={() => setLockOpened(false)}
          onLocked={() => {
            notifications.show({
              color: "green",
              title: "Decision locked",
              message:
                "The authoritative outcome and its snapshot are now available.",
            });
          }}
        />
      )}
    </article>
  );
}