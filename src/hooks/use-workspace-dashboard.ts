"use client";

import { useQuery } from "@tanstack/react-query";

import { getApiStatus } from "@/services/auth.service";
import {
  getDecisionExport,
  listAttachments,
  listDecisionActions,
  listDecisionReviews,
  listObjections,
  listProposals,
  listVotingSessions,
  type Attachment,
  type Decision,
  type DecisionAction,
  type DecisionExport,
  type DecisionReview,
  type Objection,
  type Proposal,
  type VotingSession,
} from "@/services/workspace.service";

export type WorkspaceDashboardDecision = {
  decision: Decision;
  actions: DecisionAction[];
  reviews: DecisionReview[];
  votingSessions: VotingSession[];
  proposals: Proposal[];
  blockingObjections: Objection[];
  decisionExport: DecisionExport | null;
  hasPartialFailure: boolean;
};

type SettledValue<T> = PromiseSettledResult<T>;

const settledValue = <T>(result: SettledValue<T>, fallback: T) =>
  result.status === "fulfilled" ? result.value : fallback;

async function loadDecisionDashboard(
  workspaceId: string,
  decision: Decision,
): Promise<WorkspaceDashboardDecision> {
  const needsLiveSignals =
    decision.status === "draft" || decision.status === "active";
  const [
    actionsResult,
    reviewsResult,
    votingResult,
    proposalsResult,
    exportResult,
  ] = await Promise.allSettled([
    listDecisionActions(workspaceId, decision.id),
    listDecisionReviews(workspaceId, decision.id),
    needsLiveSignals
      ? listVotingSessions(workspaceId, decision.id)
      : Promise.resolve([] as VotingSession[]),
    needsLiveSignals
      ? listProposals(workspaceId, decision.id)
      : Promise.resolve([] as Proposal[]),
    decision.status === "locked"
      ? getDecisionExport(workspaceId, decision.id)
      : Promise.resolve(null),
  ]);

  const proposals = settledValue(proposalsResult, [] as Proposal[]);
  const objectionResults = await Promise.allSettled(
    proposals
      .filter((proposal) => proposal.status !== "withdrawn")
      .map((proposal) =>
        listObjections(workspaceId, decision.id, proposal.id, {
          status: "open",
          severity: "blocking",
        }),
      ),
  );
  const blockingObjections = objectionResults.flatMap((result) =>
    settledValue(result, [] as Objection[]),
  );
  const exportMissing =
    exportResult.status === "rejected" &&
    getApiStatus(exportResult.reason) === 404;

  return {
    decision,
    actions: settledValue(actionsResult, [] as DecisionAction[]),
    reviews: settledValue(reviewsResult, [] as DecisionReview[]),
    votingSessions: settledValue(votingResult, [] as VotingSession[]),
    proposals,
    blockingObjections,
    decisionExport: settledValue(exportResult, null as DecisionExport | null),
    hasPartialFailure:
      actionsResult.status === "rejected" ||
      reviewsResult.status === "rejected" ||
      votingResult.status === "rejected" ||
      proposalsResult.status === "rejected" ||
      objectionResults.some((result) => result.status === "rejected") ||
      (exportResult.status === "rejected" && !exportMissing),
  };
}

export function useWorkspaceDashboardData(
  workspaceId: string,
  decisions: Decision[],
) {
  const decisionSignature = decisions
    .map((decision) => `${decision.id}:${decision.updated_at}`)
    .join("|");

  const decisionDetails = useQuery({
    queryKey: ["workspace-dashboard", workspaceId, decisionSignature],
    queryFn: () =>
      Promise.all(
        decisions
          .filter((decision) => decision.status !== "archived")
          .map((decision) => loadDecisionDashboard(workspaceId, decision)),
      ),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });

  const attachments = useQuery<Attachment[]>({
    queryKey: ["workspace-dashboard", workspaceId, "attachments"],
    queryFn: () => listAttachments(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
    refetchInterval: (query) =>
      query.state.data?.some(
        (attachment) =>
          attachment.status === "pending" || attachment.status === "processing",
      )
        ? 2_500
        : false,
  });

  return {
    decisionDetails: decisionDetails.data ?? [],
    attachments: attachments.data ?? [],
    isPending: decisionDetails.isPending || attachments.isPending,
    isFetching: decisionDetails.isFetching || attachments.isFetching,
    isError: decisionDetails.isError || attachments.isError,
    hasPartialFailure:
      decisionDetails.data?.some((decision) => decision.hasPartialFailure) ??
      false,
    refetch: async () => {
      await Promise.all([decisionDetails.refetch(), attachments.refetch()]);
    },
  };
}