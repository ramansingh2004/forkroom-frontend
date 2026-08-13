"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  authorizeIntegration,
  disconnectIntegration,
  listIntegrationDestinations,
  listIntegrationProviders,
  listIntegrationSubscriptions,
  listWorkspaceIntegrations,
  testIntegration,
  updateIntegrationSubscriptions,
  type IntegrationProviderName,
  type IntegrationSubscriptionUpdate,
} from "@/services/integration.service";

export const integrationKeys = {
  all: ["integrations"] as const,
  providers: () => [...integrationKeys.all, "providers"] as const,
  connections: (workspaceId: string) =>
    [...integrationKeys.all, "connections", workspaceId] as const,
  destinations: (workspaceId: string, connectionId: string) =>
    [
      ...integrationKeys.connections(workspaceId),
      connectionId,
      "destinations",
    ] as const,
  subscriptions: (workspaceId: string, connectionId: string) =>
    [
      ...integrationKeys.connections(workspaceId),
      connectionId,
      "subscriptions",
    ] as const,
};

export function useIntegrationProviders() {
  return useQuery({
    queryKey: integrationKeys.providers(),
    queryFn: listIntegrationProviders,
    staleTime: 5 * 60_000,
  });
}

export function useWorkspaceIntegrations(workspaceId: string) {
  return useQuery({
    queryKey: integrationKeys.connections(workspaceId),
    queryFn: () => listWorkspaceIntegrations(workspaceId),
  });
}

export function useAuthorizeIntegration(workspaceId: string) {
  return useMutation({
    mutationFn: (provider: IntegrationProviderName) =>
      authorizeIntegration(workspaceId, provider),
  });
}

export function useIntegrationDestinations(
  workspaceId: string,
  connectionId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: integrationKeys.destinations(workspaceId, connectionId),
    queryFn: () => listIntegrationDestinations(workspaceId, connectionId),
    enabled,
    staleTime: 60_000,
  });
}

export function useIntegrationSubscriptions(
  workspaceId: string,
  connectionId: string,
) {
  return useQuery({
    queryKey: integrationKeys.subscriptions(workspaceId, connectionId),
    queryFn: () => listIntegrationSubscriptions(workspaceId, connectionId),
  });
}

export function useUpdateIntegrationSubscriptions(
  workspaceId: string,
  connectionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscriptions: IntegrationSubscriptionUpdate[]) =>
      updateIntegrationSubscriptions(workspaceId, connectionId, subscriptions),
    onSuccess: (subscriptions) => {
      queryClient.setQueryData(
        integrationKeys.subscriptions(workspaceId, connectionId),
        subscriptions,
      );
    },
  });
}

export function useTestIntegration(workspaceId: string, connectionId: string) {
  return useMutation({
    mutationFn: (destinationId: string | null) =>
      testIntegration(workspaceId, connectionId, destinationId),
  });
}

export function useDisconnectIntegration(
  workspaceId: string,
  connectionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => disconnectIntegration(workspaceId, connectionId),
    onSuccess: async () => {
      queryClient.removeQueries({
        queryKey: integrationKeys.destinations(workspaceId, connectionId),
      });
      queryClient.removeQueries({
        queryKey: integrationKeys.subscriptions(workspaceId, connectionId),
      });
      await queryClient.invalidateQueries({
        queryKey: integrationKeys.connections(workspaceId),
      });
    },
  });
}
