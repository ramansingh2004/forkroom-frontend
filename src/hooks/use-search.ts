'use client';

import { useQuery } from '@tanstack/react-query';
import { searchWorkspace } from '@/services/search.service';

export const searchKeys = {
  all: ['workspace-search'] as const,
  query: (workspaceId: string, query: string) =>
    [...searchKeys.all, workspaceId, query] as const,
};

export function useWorkspaceSearch(
  workspaceId: string | undefined,
  query: string,
) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: searchKeys.query(workspaceId ?? '', normalizedQuery),
    queryFn: () => searchWorkspace(workspaceId!, normalizedQuery),
    enabled: Boolean(workspaceId && normalizedQuery.length >= 2),
    staleTime: 30_000,
  });
}
