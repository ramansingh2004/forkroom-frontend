"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addWorkspaceMember,
  cancelDecisionReview,
  cancelVotingSession,
  castVote,
  closeVotingSession,
  completeDecisionReview,
  completeAttachmentUpload,
  createAttachmentDownload,
  createAttachmentUpload,
  createDecisionAction,
  createDecisionExportDownload,
  createDecisionLock,
  createObjection,
  createDecision,
  createProposal,
  createDecisionReview,
  createVotingSession,
  createWorkspace,
  deleteAttachment,
  deleteWorkspace,
  deleteProposal,
  getDecision,
  getDecisionExport,
  getDecisionLock,
  getDecisionRevision,
  getVotingResult,
  getWorkspace,
  listCriteria,
  listDecisionActions,
  listDecisionReviews,
  listDecisionRevisions,
  listAttachments,
  listObjections,
  listProposals,
  listVotingSessions,
  listWorkspaceDecisions,
  listWorkspaceMembers,
  listWorkspaces,
  openVotingSession,
  requestDecisionExport,
  removeWorkspaceMember,
  transitionDecision,
  transitionProposal,
  transitionDecisionAction,
  transitionObjection,
  updateDecisionAction,
  updateDecisionReview,
  updateWorkspace,
  updateWorkspaceMember,
  updateObjection,
  updateProposal,
  uploadAttachmentObject,
  verifyDecisionLock,
  type DecisionLockCreateRequest,
  type Attachment,
  type ActionCreateRequest,
  type ActionTransitionRequest,
  type ActionUpdateRequest,
  type DecisionStatus,
  type DecisionCreateRequest,
  type DecisionTransitionRequest,
  type ObjectionCreateRequest,
  type ObjectionFilters,
  type ObjectionTransitionRequest,
  type ObjectionUpdateRequest,
  type ProposalCreateRequest,
  type ProposalStatus,
  type ProposalUpdateRequest,
  type ReviewCreateRequest,
  type ReviewOutcomeRequest,
  type ReviewUpdateRequest,
  type VoteCastRequest,
  type VotingSessionCreateRequest,
  type Workspace,
  type WorkspaceCreateRequest,
  type WorkspaceMember,
  type WorkspaceMemberCreateRequest,
  type WorkspaceMemberUpdateRequest,
  type WorkspaceUpdateRequest,
} from "@/services/workspace.service";
import { getApiStatus } from "@/services/auth.service";

export const workspaceKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceKeys.all, "list"] as const,
  detail: (workspaceId: string) =>
    [...workspaceKeys.all, "detail", workspaceId] as const,
  members: (workspaceId: string) =>
    [...workspaceKeys.all, "members", workspaceId] as const,
  decisions: (workspaceId: string, status?: DecisionStatus) =>
    [...workspaceKeys.all, "decisions", workspaceId, status ?? "all"] as const,
  decision: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.all, "decision", workspaceId, decisionId] as const,
  proposals: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.all, "proposals", workspaceId, decisionId] as const,
  criteria: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.all, "criteria", workspaceId, decisionId] as const,
  objectionsRoot: (
    workspaceId: string,
    decisionId: string,
    proposalId: string,
  ) =>
    [
      ...workspaceKeys.all,
      "objections",
      workspaceId,
      decisionId,
      proposalId,
    ] as const,
  objections: (
    workspaceId: string,
    decisionId: string,
    proposalId: string,
    filters?: ObjectionFilters,
  ) =>
    [
      ...workspaceKeys.objectionsRoot(workspaceId, decisionId, proposalId),
      filters?.severity ?? "all-severities",
      filters?.status ?? "all-statuses",
    ] as const,
  votingSessions: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.all, "voting-sessions", workspaceId, decisionId] as const,
  votingResult: (
    workspaceId: string,
    decisionId: string,
    votingSessionId: string,
  ) =>
    [
      ...workspaceKeys.votingSessions(workspaceId, decisionId),
      votingSessionId,
      "result",
    ] as const,
  decisionLock: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.decision(workspaceId, decisionId), "lock"] as const,
  decisionLockVerification: (workspaceId: string, decisionId: string) =>
    [
      ...workspaceKeys.decisionLock(workspaceId, decisionId),
      "verification",
    ] as const,
  decisionExport: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.decisionLock(workspaceId, decisionId), "export"] as const,
  decisionActions: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.decision(workspaceId, decisionId), "actions"] as const,
  decisionReviews: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.decision(workspaceId, decisionId), "reviews"] as const,
  decisionRevisions: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.decision(workspaceId, decisionId), "revisions"] as const,
  decisionRevision: (
    workspaceId: string,
    decisionId: string,
    revisionId: string,
  ) =>
    [
      ...workspaceKeys.decisionRevisions(workspaceId, decisionId),
      revisionId,
    ] as const,
  decisionAttachments: (workspaceId: string, decisionId: string) =>
    [
      ...workspaceKeys.decision(workspaceId, decisionId),
      "attachments",
    ] as const,
};

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: listWorkspaces,
  });
}

export function useWorkspace(workspaceId?: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId ?? ""),
    queryFn: () => getWorkspace(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

export function useWorkspaceMembers(workspaceId?: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId ?? ""),
    queryFn: () => listWorkspaceMembers(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

export function useAddWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WorkspaceMemberCreateRequest) =>
      addWorkspaceMember(workspaceId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
    },
  });
}

export function useUpdateWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberUserId,
      payload,
    }: {
      memberUserId: string;
      payload: WorkspaceMemberUpdateRequest;
    }) => updateWorkspaceMember(workspaceId, memberUserId, payload),
    onSuccess: async (member) => {
      queryClient.setQueryData(
        workspaceKeys.members(workspaceId),
        (current: WorkspaceMember[] | undefined) =>
          current?.map((item) =>
            item.user_id === member.user_id ? member : item,
          ),
      );

      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
    },
  });
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberUserId: string) =>
      removeWorkspaceMember(workspaceId, memberUserId),
    onSuccess: async (_, memberUserId) => {
      queryClient.setQueryData(
        workspaceKeys.members(workspaceId),
        (current: WorkspaceMember[] | undefined) =>
          current?.filter((item) => item.user_id !== memberUserId),
      );

      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
    },
  });
}

export function useWorkspaceDecisions(
  workspaceId?: string,
  status?: DecisionStatus,
) {
  return useQuery({
    queryKey: workspaceKeys.decisions(workspaceId ?? "", status),
    queryFn: () => listWorkspaceDecisions(workspaceId!, status),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WorkspaceCreateRequest) => createWorkspace(payload),
    onSuccess: async (workspace) => {
      queryClient.setQueryData(workspaceKeys.detail(workspace.id), workspace);
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WorkspaceUpdateRequest) =>
      updateWorkspace(workspaceId, payload),
    onSuccess: async (workspace) => {
      queryClient.setQueryData(workspaceKeys.detail(workspaceId), workspace);
      queryClient.setQueryData(
        workspaceKeys.list(),
        (current: Workspace[] | undefined) =>
          current?.map((item) =>
            item.id === workspace.id ? workspace : item,
          ),
      );
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

export function useDeleteWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteWorkspace(workspaceId),
    onSuccess: async () => {
      queryClient.setQueryData(
        workspaceKeys.list(),
        (current: Workspace[] | undefined) =>
          current?.filter((workspace) => workspace.id !== workspaceId),
      );
      queryClient.removeQueries({
        predicate: (query) => query.queryKey.includes(workspaceId),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceKeys.list() }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}

export function useCreateDecision(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DecisionCreateRequest) =>
      createDecision(workspaceId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...workspaceKeys.all, "decisions", workspaceId],
      });
    },
  });
}

export function useDecision(workspaceId?: string, decisionId?: string) {
  return useQuery({
    queryKey: workspaceKeys.decision(workspaceId ?? "", decisionId ?? ""),
    queryFn: () => getDecision(workspaceId!, decisionId!),
    enabled: Boolean(workspaceId && decisionId),
  });
}

export function useDecisionProposals(
  workspaceId?: string,
  decisionId?: string,
) {
  return useQuery({
    queryKey: workspaceKeys.proposals(workspaceId ?? "", decisionId ?? ""),
    queryFn: () => listProposals(workspaceId!, decisionId!),
    enabled: Boolean(workspaceId && decisionId),
  });
}

export function useCreateProposal(workspaceId: string, decisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProposalCreateRequest) =>
      createProposal(workspaceId, decisionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.proposals(workspaceId, decisionId),
      });
    },
  });
}

export function useUpdateProposal(workspaceId: string, decisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      payload,
    }: {
      proposalId: string;
      payload: ProposalUpdateRequest;
    }) => updateProposal(workspaceId, decisionId, proposalId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.proposals(workspaceId, decisionId),
      });
    },
  });
}

export function useDeleteProposal(workspaceId: string, decisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (proposalId: string) =>
      deleteProposal(workspaceId, decisionId, proposalId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.proposals(workspaceId, decisionId),
      });
    },
  });
}

export function useTransitionProposal(workspaceId: string, decisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      status,
    }: {
      proposalId: string;
      status: ProposalStatus;
    }) => transitionProposal(workspaceId, decisionId, proposalId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.proposals(workspaceId, decisionId),
      });
    },
  });
}

export function useDecisionCriteria(workspaceId?: string, decisionId?: string) {
  return useQuery({
    queryKey: workspaceKeys.criteria(workspaceId ?? "", decisionId ?? ""),
    queryFn: () => listCriteria(workspaceId!, decisionId!),
    enabled: Boolean(workspaceId && decisionId),
  });
}

export function useProposalObjections(
  workspaceId?: string,
  decisionId?: string,
  proposalId?: string,
  filters?: ObjectionFilters,
) {
  return useQuery({
    queryKey: workspaceKeys.objections(
      workspaceId ?? "",
      decisionId ?? "",
      proposalId ?? "",
      filters,
    ),
    queryFn: () =>
      listObjections(workspaceId!, decisionId!, proposalId!, filters),
    enabled: Boolean(workspaceId && decisionId && proposalId),
  });
}

export function useCreateObjection(
  workspaceId: string,
  decisionId: string,
  proposalId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ObjectionCreateRequest) =>
      createObjection(workspaceId, decisionId, proposalId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.objectionsRoot(
          workspaceId,
          decisionId,
          proposalId,
        ),
      });
    },
  });
}

export function useUpdateObjection(
  workspaceId: string,
  decisionId: string,
  proposalId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      objectionId,
      payload,
    }: {
      objectionId: string;
      payload: ObjectionUpdateRequest;
    }) =>
      updateObjection(
        workspaceId,
        decisionId,
        proposalId,
        objectionId,
        payload,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.objectionsRoot(
          workspaceId,
          decisionId,
          proposalId,
        ),
      });
    },
  });
}

export function useTransitionObjection(
  workspaceId: string,
  decisionId: string,
  proposalId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      objectionId,
      payload,
    }: {
      objectionId: string;
      payload: ObjectionTransitionRequest;
    }) =>
      transitionObjection(
        workspaceId,
        decisionId,
        proposalId,
        objectionId,
        payload,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.objectionsRoot(
          workspaceId,
          decisionId,
          proposalId,
        ),
      });
    },
  });
}

export function useOpenBlockingObjections(
  workspaceId: string,
  decisionId: string,
  proposalIds: string[],
) {
  const queries = useQueries({
    queries: proposalIds.map((proposalId) => ({
      queryKey: workspaceKeys.objections(workspaceId, decisionId, proposalId, {
        severity: "blocking",
        status: "open",
      }),
      queryFn: () =>
        listObjections(workspaceId, decisionId, proposalId, {
          severity: "blocking",
          status: "open",
        }),
      enabled: Boolean(workspaceId && decisionId && proposalId),
    })),
  });

  return {
    objections: queries.flatMap((query) => query.data ?? []),
    isPending: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
  };
}

export function useDecisionOpenObjections(
  workspaceId: string,
  decisionId: string,
  proposalIds: string[],
) {
  const queries = useQueries({
    queries: proposalIds.map((proposalId) => ({
      queryKey: workspaceKeys.objections(workspaceId, decisionId, proposalId, {
        status: "open",
      }),
      queryFn: () =>
        listObjections(workspaceId, decisionId, proposalId, {
          status: "open",
        }),
      enabled: Boolean(workspaceId && decisionId && proposalId),
    })),
  });

  return {
    objections: queries.flatMap((query) => query.data ?? []),
    isPending: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
  };
}

export function useVotingSessions(workspaceId?: string, decisionId?: string) {
  return useQuery({
    queryKey: workspaceKeys.votingSessions(workspaceId ?? "", decisionId ?? ""),
    queryFn: () => listVotingSessions(workspaceId!, decisionId!),
    enabled: Boolean(workspaceId && decisionId),
  });
}

export function useTransitionDecision(workspaceId: string, decisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DecisionTransitionRequest) =>
      transitionDecision(workspaceId, decisionId, payload),
    onSuccess: async (updatedDecision) => {
      queryClient.setQueryData(
        workspaceKeys.decision(workspaceId, decisionId),
        updatedDecision,
      );
      await queryClient.invalidateQueries({
        queryKey: [...workspaceKeys.all, "decisions", workspaceId],
      });
    },
  });
}

export function useCreateVotingSession(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VotingSessionCreateRequest) =>
      createVotingSession(workspaceId, decisionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.votingSessions(workspaceId, decisionId),
      });
    },
  });
}

export function useOpenVotingSession(workspaceId: string, decisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (votingSessionId: string) =>
      openVotingSession(workspaceId, decisionId, votingSessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.votingSessions(workspaceId, decisionId),
      });
    },
  });
}

export function useCastVote(
  workspaceId: string,
  decisionId: string,
  votingSessionId: string,
) {
  return useMutation({
    mutationFn: (payload: VoteCastRequest) =>
      castVote(workspaceId, decisionId, votingSessionId, payload),
  });
}

export function useCloseVotingSession(workspaceId: string, decisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (votingSessionId: string) =>
      closeVotingSession(workspaceId, decisionId, votingSessionId),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.votingSessions(workspaceId, decisionId),
      });
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.votingResult(
          workspaceId,
          decisionId,
          session.id,
        ),
      });
    },
  });
}

export function useCancelVotingSession(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (votingSessionId: string) =>
      cancelVotingSession(workspaceId, decisionId, votingSessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.votingSessions(workspaceId, decisionId),
      });
    },
  });
}

export function useVotingResult(
  workspaceId: string,
  decisionId: string,
  votingSessionId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: workspaceKeys.votingResult(
      workspaceId,
      decisionId,
      votingSessionId ?? "",
    ),
    queryFn: () => getVotingResult(workspaceId, decisionId, votingSessionId!),
    enabled: Boolean(votingSessionId && enabled),
  });
}

export function useDecisionLock(
  workspaceId?: string,
  decisionId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: workspaceKeys.decisionLock(workspaceId ?? "", decisionId ?? ""),
    queryFn: () => getDecisionLock(workspaceId!, decisionId!),
    enabled: Boolean(workspaceId && decisionId && enabled),
  });
}

export function useCreateDecisionLock(workspaceId: string, decisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DecisionLockCreateRequest) =>
      createDecisionLock(workspaceId, decisionId, payload),
    onSuccess: async (decisionLock) => {
      queryClient.setQueryData(
        workspaceKeys.decisionLock(workspaceId, decisionId),
        decisionLock,
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.decision(workspaceId, decisionId),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.proposals(workspaceId, decisionId),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.votingSessions(workspaceId, decisionId),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.decisionLockVerification(
            workspaceId,
            decisionId,
          ),
        }),
      ]);
    },
  });
}

export function useDecisionLockVerification(
  workspaceId?: string,
  decisionId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: workspaceKeys.decisionLockVerification(
      workspaceId ?? "",
      decisionId ?? "",
    ),
    queryFn: () => verifyDecisionLock(workspaceId!, decisionId!),
    enabled: Boolean(workspaceId && decisionId && enabled),
  });
}

export function useDecisionExport(
  workspaceId?: string,
  decisionId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: workspaceKeys.decisionExport(workspaceId ?? "", decisionId ?? ""),
    queryFn: () => getDecisionExport(workspaceId!, decisionId!),
    enabled: Boolean(workspaceId && decisionId && enabled),
    retry: (failureCount, error) =>
      getApiStatus(error) !== 404 && failureCount < 2,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 2_500 : false;
    },
  });
}

export function useRequestDecisionExport(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestDecisionExport(workspaceId, decisionId),
    onSuccess: async (decisionExport) => {
      queryClient.setQueryData(
        workspaceKeys.decisionExport(workspaceId, decisionId),
        decisionExport,
      );

      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.decisionExport(workspaceId, decisionId),
      });
    },
  });
}

export function useDecisionExportDownload(
  workspaceId: string,
  decisionId: string,
) {
  return useMutation({
    mutationFn: () => createDecisionExportDownload(workspaceId, decisionId),
  });
}

export function useDecisionActions(workspaceId?: string, decisionId?: string) {
  return useQuery({
    queryKey: workspaceKeys.decisionActions(
      workspaceId ?? "",
      decisionId ?? "",
    ),
    queryFn: () => listDecisionActions(workspaceId!, decisionId!),
    enabled: Boolean(workspaceId && decisionId),
  });
}

export function useCreateDecisionAction(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ActionCreateRequest) =>
      createDecisionAction(workspaceId, decisionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.decisionActions(workspaceId, decisionId),
      });
    },
  });
}

export function useUpdateDecisionAction(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      actionId,
      payload,
    }: {
      actionId: string;
      payload: ActionUpdateRequest;
    }) => updateDecisionAction(workspaceId, decisionId, actionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.decisionActions(workspaceId, decisionId),
      });
    },
  });
}

export function useTransitionDecisionAction(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      actionId,
      payload,
    }: {
      actionId: string;
      payload: ActionTransitionRequest;
    }) => transitionDecisionAction(workspaceId, decisionId, actionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.decisionActions(workspaceId, decisionId),
      });
    },
  });
}

export function useDecisionReviews(workspaceId?: string, decisionId?: string) {
  return useQuery({
    queryKey: workspaceKeys.decisionReviews(
      workspaceId ?? "",
      decisionId ?? "",
    ),
    queryFn: () => listDecisionReviews(workspaceId!, decisionId!),
    enabled: Boolean(workspaceId && decisionId),
  });
}

export function useCreateDecisionReview(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReviewCreateRequest) =>
      createDecisionReview(workspaceId, decisionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.decisionReviews(workspaceId, decisionId),
      });
    },
  });
}

export function useUpdateDecisionReview(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: ReviewUpdateRequest;
    }) => updateDecisionReview(workspaceId, decisionId, reviewId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.decisionReviews(workspaceId, decisionId),
      });
    },
  });
}

export function useCancelDecisionReview(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) =>
      cancelDecisionReview(workspaceId, decisionId, reviewId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.decisionReviews(workspaceId, decisionId),
      });
    },
  });
}

export function useCompleteDecisionReview(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: ReviewOutcomeRequest;
    }) => completeDecisionReview(workspaceId, decisionId, reviewId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.decisionReviews(workspaceId, decisionId),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.decision(workspaceId, decisionId),
        }),
        queryClient.invalidateQueries({
          queryKey: [...workspaceKeys.all, "decisions", workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.decisionRevisions(workspaceId, decisionId),
        }),
      ]);
    },
  });
}

export function useDecisionRevisions(
  workspaceId?: string,
  decisionId?: string,
) {
  return useQuery({
    queryKey: workspaceKeys.decisionRevisions(
      workspaceId ?? "",
      decisionId ?? "",
    ),
    queryFn: () => listDecisionRevisions(workspaceId!, decisionId!),
    enabled: Boolean(workspaceId && decisionId),
  });
}

export function useDecisionRevision(
  workspaceId?: string,
  decisionId?: string,
  revisionId?: string,
) {
  return useQuery({
    queryKey: workspaceKeys.decisionRevision(
      workspaceId ?? "",
      decisionId ?? "",
      revisionId ?? "",
    ),
    queryFn: () => getDecisionRevision(workspaceId!, decisionId!, revisionId!),
    enabled: Boolean(workspaceId && decisionId && revisionId),
  });
}

export type AttachmentUploadStage = "preparing" | "uploading" | "processing";

type UploadAttachmentInput = {
  file: File;
  proposalId?: string | null;
  onStageChange?: (stage: AttachmentUploadStage) => void;
};

export function useDecisionAttachments(
  workspaceId?: string,
  decisionId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: workspaceKeys.decisionAttachments(
      workspaceId ?? "",
      decisionId ?? "",
    ),
    queryFn: () =>
      listAttachments(workspaceId!, {
        decisionId: decisionId!,
      }),
    enabled: Boolean(workspaceId && decisionId && enabled),
    refetchInterval: (query) =>
      query.state.data?.some(
        (attachment) =>
          attachment.status === "pending" || attachment.status === "processing",
      )
        ? 2_500
        : false,
  });
}

export function useUploadDecisionAttachment(
  workspaceId: string,
  decisionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation<Attachment, Error, UploadAttachmentInput>({
    mutationFn: async ({ file, proposalId, onStageChange }) => {
      const mediaType = file.type || "application/octet-stream";

      onStageChange?.("preparing");
      const prepared = await createAttachmentUpload(workspaceId, {
        filename: file.name,
        media_type: mediaType,
        size_bytes: file.size,
        decision_id: decisionId,
        proposal_id: proposalId ?? null,
      });

      onStageChange?.("uploading");
      await uploadAttachmentObject(prepared.upload_url, file, mediaType);

      onStageChange?.("processing");
      return completeAttachmentUpload(workspaceId, prepared.attachment.id);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.decisionAttachments(workspaceId, decisionId),
      });
    },
  });
}

export function useDeleteAttachment(workspaceId: string, decisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: string) =>
      deleteAttachment(workspaceId, attachmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceKeys.decisionAttachments(workspaceId, decisionId),
      });
    },
  });
}

export function useAttachmentDownload(workspaceId: string) {
  return useMutation({
    mutationFn: (attachmentId: string) =>
      createAttachmentDownload(workspaceId, attachmentId),
  });
}