'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createWorkspace,
  createDecision,
  getDecision,
  getWorkspace,
  listWorkspaceDecisions,
  listWorkspaceMembers,
  listWorkspaces,
  type DecisionStatus,
  type DecisionCreateRequest,
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
  [
    ...workspaceKeys.all,
    'decision',
    workspaceId,
    decisionId,
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