import { apiClient } from '@/lib/api/client';
import type { components } from '@/lib/api/generated/api-types';

export type Workspace = components['schemas']['WorkspaceResponse'];
export type WorkspaceCreateRequest = components['schemas']['WorkspaceCreateRequest'];
export type WorkspaceUpdateRequest = components['schemas']['WorkspaceUpdateRequest'];
export type WorkspaceMember = components['schemas']['WorkspaceMemberResponse'];
export type Decision = components['schemas']['DecisionResponse'];
export type DecisionStatus = components['schemas']['DecisionStatus'];
export type DecisionCreateRequest = components['schemas']['DecisionCreateRequest'];

export async function listWorkspaces() {
  const { data } = await apiClient.get<Workspace[]>('/workspaces');
  return data;
}

export async function getWorkspace(workspaceId: string) {
  const { data } = await apiClient.get<Workspace>(`/workspaces/${workspaceId}`);
  return data;
}

export async function createWorkspace(payload: WorkspaceCreateRequest) {
  const { data } = await apiClient.post<Workspace>('/workspaces', payload);
  return data;
}

export async function updateWorkspace(workspaceId: string, payload: WorkspaceUpdateRequest) {
  const { data } = await apiClient.patch<Workspace>(`/workspaces/${workspaceId}`, payload);
  return data;
}

export async function listWorkspaceMembers(workspaceId: string) {
  const { data } = await apiClient.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
  return data;
}

export async function listWorkspaceDecisions(
  workspaceId: string,
  status?: DecisionStatus,
) {
  const { data } = await apiClient.get<Decision[]>(`/workspaces/${workspaceId}/decisions`, {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function createDecision(workspaceId: string, payload: DecisionCreateRequest) {
  const { data } = await apiClient.post<Decision>(`/workspaces/${workspaceId}/decisions`, payload);
  return data;
}