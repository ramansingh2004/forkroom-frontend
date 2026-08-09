'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDecision,
  createObjection,
  createProposal,
  createWorkspace,
  deleteProposal,
  getDecision,
  getWorkspace,
  listCriteria,
  listObjections,
  listProposals,
  listWorkspaceDecisions,
  listWorkspaceMembers,
  listWorkspaces,
  transitionObjection,
  transitionProposal,
  updateObjection,
  updateProposal,
  type DecisionCreateRequest,
  type DecisionStatus,
  type ObjectionCreateRequest,
  type ObjectionFilters,
  type ObjectionTransitionRequest,
  type ObjectionUpdateRequest,
  type ProposalCreateRequest,
  type ProposalStatus,
  type ProposalUpdateRequest,
  type WorkspaceCreateRequest,
} from '@/services/workspace.service';

export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  detail: (workspaceId: string) => [...workspaceKeys.all, 'detail', workspaceId] as const,
  members: (workspaceId: string) => [...workspaceKeys.all, 'members', workspaceId] as const,
  decisions: (workspaceId: string, status?: DecisionStatus) =>
    [...workspaceKeys.all, 'decisions', workspaceId, status ?? 'all'] as const,
  decision: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.all, 'decision', workspaceId, decisionId] as const,
  proposals: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.all, 'proposals', workspaceId, decisionId] as const,
  criteria: (workspaceId: string, decisionId: string) =>
    [...workspaceKeys.all, 'criteria', workspaceId, decisionId] as const,
  objectionsRoot: (
  workspaceId: string,
  decisionId: string,
  proposalId: string,
) =>
  [
    ...workspaceKeys.all,
    'objections',
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
    ...workspaceKeys.objectionsRoot(
      workspaceId,
      decisionId,
      proposalId,
    ),
    filters?.severity ?? 'all-severities',
    filters?.status ?? 'all-statuses',
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
    queryKey: workspaceKeys.detail(workspaceId ?? ''),
    queryFn: () => getWorkspace(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

export function useWorkspaceMembers(workspaceId?: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId ?? ''),
    queryFn: () => listWorkspaceMembers(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

export function useWorkspaceDecisions(workspaceId?: string, status?: DecisionStatus) {
  return useQuery({
    queryKey: workspaceKeys.decisions(workspaceId ?? '', status),
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

export function useCreateDecision(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DecisionCreateRequest) => createDecision(workspaceId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...workspaceKeys.all, 'decisions', workspaceId],
      });
    },
  });
}

export function useDecision(
  workspaceId?: string,
  decisionId?: string,
) {
  return useQuery({
    queryKey: workspaceKeys.decision(
      workspaceId ?? '',
      decisionId ?? '',
    ),
    queryFn: () =>
      getDecision(workspaceId!, decisionId!),
    enabled: Boolean(workspaceId && decisionId),
  });
}

export function useDecisionProposals(
  workspaceId?: string,
  decisionId?: string,
) {
  return useQuery({
    queryKey: workspaceKeys.proposals(
      workspaceId ?? '',
      decisionId ?? '',
    ),
    queryFn: () =>
      listProposals(workspaceId!, decisionId!),
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

export function useDecisionCriteria(
  workspaceId?: string,
  decisionId?: string,
) {
  return useQuery({
    queryKey: workspaceKeys.criteria(
      workspaceId ?? '',
      decisionId ?? '',
    ),
    queryFn: () =>
      listCriteria(workspaceId!, decisionId!),
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
      workspaceId ?? '',
      decisionId ?? '',
      proposalId ?? '',
      filters,
    ),
    queryFn: () =>
      listObjections(
        workspaceId!,
        decisionId!,
        proposalId!,
        filters,
      ),
    enabled: Boolean(
      workspaceId &&
        decisionId &&
        proposalId,
    ),
  });
}

export function useCreateObjection(
  workspaceId: string,
  decisionId: string,
  proposalId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      payload: ObjectionCreateRequest,
    ) =>
      createObjection(
        workspaceId,
        decisionId,
        proposalId,
        payload,
      ),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          workspaceKeys.objectionsRoot(
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
        queryKey:
          workspaceKeys.objectionsRoot(
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
        queryKey:
          workspaceKeys.objectionsRoot(
            workspaceId,
            decisionId,
            proposalId,
          ),
      });
    },
  });
}