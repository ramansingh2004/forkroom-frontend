import { apiClient } from '@/lib/api/client';
import type { components } from '@/lib/api/generated/api-types';

export type Workspace = components['schemas']['WorkspaceResponse'];
export type WorkspaceCreateRequest = components['schemas']['WorkspaceCreateRequest'];
export type WorkspaceUpdateRequest = components['schemas']['WorkspaceUpdateRequest'];
export type WorkspaceMember = components['schemas']['WorkspaceMemberResponse'];
export type Decision = components['schemas']['DecisionResponse'];
export type DecisionStatus = components['schemas']['DecisionStatus'];
export type DecisionCreateRequest = components['schemas']['DecisionCreateRequest'];
export type Proposal = components['schemas']['ProposalResponse'];
export type ProposalCreateRequest = components['schemas']['ProposalCreateRequest'];
export type ProposalUpdateRequest = components['schemas']['ProposalUpdateRequest'];
export type ProposalStatus = components['schemas']['ProposalStatus'];
export type Criterion = components['schemas']['CriterionResponse'];
export type Objection = components['schemas']['ObjectionResponse'];
export type ObjectionCreateRequest = components['schemas']['ObjectionCreateRequest'];
export type ObjectionUpdateRequest = components['schemas']['ObjectionUpdateRequest'];
export type ObjectionSeverity = components['schemas']['ObjectionSeverity'];
export type ObjectionStatus = components['schemas']['ObjectionStatus'];
export type ObjectionTransitionRequest = components['schemas']['ObjectionTransitionRequest'];
export type VotingSession = components['schemas']['VotingSessionResponse'];
export type VotingSessionCreateRequest = components['schemas']['VotingSessionCreateRequest'];
export type VotingSessionStatus = components['schemas']['VotingSessionStatus'];
export type VoteCastRequest = components['schemas']['VoteCastRequest'];
export type Vote = components['schemas']['VoteResponse'];
export type VotingResult = components['schemas']['VotingResultResponse'];
export type DecisionLock = components['schemas']['DecisionLockResponse'];
export type DecisionLockCreateRequest = components['schemas']['DecisionLockCreateRequest'];
export type DecisionLockVerification =
  components['schemas']['DecisionLockVerificationResponse'];
export type DecisionExport = components['schemas']['DecisionExportResponse'];
export type DecisionExportDownload =
  components['schemas']['DecisionExportDownloadResponse'];

export type ObjectionFilters = {
  severity?: ObjectionSeverity;
  status?: ObjectionStatus;
};

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

export async function getDecision(
  workspaceId: string,
  decisionId: string,
) {
  const { data } = await apiClient.get<Decision>(
    `/workspaces/${workspaceId}/decisions/${decisionId}`,
  );

  return data;
}

export async function listProposals(
  workspaceId: string,
  decisionId: string,
) {
  const { data } = await apiClient.get<Proposal[]>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/proposals`,
  );

  return data;
}

export async function createProposal(
  workspaceId: string,
  decisionId: string,
  payload: ProposalCreateRequest,
) {
  const { data } = await apiClient.post<Proposal>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/proposals`,
    payload,
  );

  return data;
}

export async function updateProposal(
  workspaceId: string,
  decisionId: string,
  proposalId: string,
  payload: ProposalUpdateRequest,
) {
  const { data } = await apiClient.patch<Proposal>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/proposals/${proposalId}`,
    payload,
  );

  return data;
}

export async function deleteProposal(
  workspaceId: string,
  decisionId: string,
  proposalId: string,
) {
  await apiClient.delete(
    `/workspaces/${workspaceId}/decisions/${decisionId}/proposals/${proposalId}`,
  );
}

export async function transitionProposal(
  workspaceId: string,
  decisionId: string,
  proposalId: string,
  status: ProposalStatus,
) {
  const { data } = await apiClient.post<Proposal>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/proposals/${proposalId}/transitions`,
    { status },
  );

  return data;
}

export async function listCriteria(
  workspaceId: string,
  decisionId: string,
) {
  const { data } = await apiClient.get<Criterion[]>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/criteria`,
  );

  return data;
}

export async function listObjections(
  workspaceId: string,
  decisionId: string,
  proposalId: string,
  filters?: ObjectionFilters,
) {
  const { data } = await apiClient.get<Objection[]>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/proposals/${proposalId}/objections`,
    { params: filters },
  );

  return data;
}

export async function createObjection(
  workspaceId: string,
  decisionId: string,
  proposalId: string,
  payload: ObjectionCreateRequest,
) {
  const { data } = await apiClient.post<Objection>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/proposals/${proposalId}/objections`,
    payload,
  );

  return data;
}

export async function updateObjection(
  workspaceId: string,
  decisionId: string,
  proposalId: string,
  objectionId: string,
  payload: ObjectionUpdateRequest,
) {
  const { data } = await apiClient.patch<Objection>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/proposals/${proposalId}/objections/${objectionId}`,
    payload,
  );

  return data;
}

export async function transitionObjection(
  workspaceId: string,
  decisionId: string,
  proposalId: string,
  objectionId: string,
  payload: ObjectionTransitionRequest,
) {
  const { data } = await apiClient.post<Objection>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/proposals/${proposalId}/objections/${objectionId}/transitions`,
    payload,
  );

  return data;
}

export async function listVotingSessions(
  workspaceId: string,
  decisionId: string,
) {
  const { data } = await apiClient.get<VotingSession[]>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/voting-sessions`,
  );

  return data;
}

export async function createVotingSession(
  workspaceId: string,
  decisionId: string,
  payload: VotingSessionCreateRequest,
) {
  const { data } = await apiClient.post<VotingSession>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/voting-sessions`,
    payload,
  );

  return data;
}

export async function openVotingSession(
  workspaceId: string,
  decisionId: string,
  votingSessionId: string,
) {
  const { data } = await apiClient.post<VotingSession>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/voting-sessions/${votingSessionId}/open`,
  );

  return data;
}

export async function castVote(
  workspaceId: string,
  decisionId: string,
  votingSessionId: string,
  payload: VoteCastRequest,
) {
  const { data } = await apiClient.post<Vote>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/voting-sessions/${votingSessionId}/votes`,
    payload,
  );

  return data;
}

export async function closeVotingSession(
  workspaceId: string,
  decisionId: string,
  votingSessionId: string,
) {
  const { data } = await apiClient.post<VotingSession>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/voting-sessions/${votingSessionId}/close`,
  );

  return data;
}

export async function cancelVotingSession(
  workspaceId: string,
  decisionId: string,
  votingSessionId: string,
) {
  const { data } = await apiClient.post<VotingSession>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/voting-sessions/${votingSessionId}/cancel`,
  );

  return data;
}

export async function getVotingResult(
  workspaceId: string,
  decisionId: string,
  votingSessionId: string,
) {
  const { data } = await apiClient.get<VotingResult>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/voting-sessions/${votingSessionId}/result`,
  );

  return data;
}

export async function getDecisionLock(
  workspaceId: string,
  decisionId: string,
) {
  const { data } = await apiClient.get<DecisionLock>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/lock`,
  );

  return data;
}

export async function createDecisionLock(
  workspaceId: string,
  decisionId: string,
  payload: DecisionLockCreateRequest,
) {
  const { data } = await apiClient.post<DecisionLock>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/lock`,
    payload,
  );

  return data;
}

export async function verifyDecisionLock(
  workspaceId: string,
  decisionId: string,
) {
  const { data } = await apiClient.get<DecisionLockVerification>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/lock/verify`,
  );

  return data;
}

export async function getDecisionExport(
  workspaceId: string,
  decisionId: string,
) {
  const { data } = await apiClient.get<DecisionExport>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/exports`,
  );

  return data;
}

export async function requestDecisionExport(
  workspaceId: string,
  decisionId: string,
) {
  const { data } = await apiClient.post<DecisionExport>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/exports`,
  );

  return data;
}

export async function createDecisionExportDownload(
  workspaceId: string,
  decisionId: string,
) {
  const { data } = await apiClient.post<DecisionExportDownload>(
    `/workspaces/${workspaceId}/decisions/${decisionId}/exports/download`,
  );

  return data;
}
