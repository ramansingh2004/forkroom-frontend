import { apiClient } from '@/lib/api/client';
import type { components } from '@/lib/api/generated/api-types';

export type WorkspaceSearchResponse = components['schemas']['SearchResponse'];
export type WorkspaceSearchResult =
  components['schemas']['SearchResultResponse'];

export async function searchWorkspace(
  workspaceId: string,
  query: string,
  limit = 8,
) {
  const { data } = await apiClient.get<WorkspaceSearchResponse>(
    `/workspaces/${workspaceId}/search`,
    {
      params: {
        q: query,
        limit,
        offset: 0,
      },
    },
  );

  return data;
}
