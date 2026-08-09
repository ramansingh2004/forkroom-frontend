'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Loader } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  Spotlight,
  type SpotlightActionData,
  type SpotlightActionGroupData,
} from '@mantine/spotlight';
import {
  IconAlertTriangle,
  IconBell,
  IconClock,
  IconHome,
  IconPlus,
  IconSearch,
  IconSwitchHorizontal,
  IconVocabulary,
} from '@tabler/icons-react';
import { useWorkspaceSearch } from '@/hooks/use-search';
import type { WorkspaceSearchResult } from '@/services/search.service';
import styles from './global-search.module.css';

const RECENT_SEARCHES_KEY = 'forkroom:recent-searches:v1';
const MAX_RECENT_SEARCHES = 5;

type RecentSearches = Record<string, string[]>;

type GlobalSearchProps = {
  canCreateDecision: boolean;
  workspaceId?: string;
  workspaceName?: string;
};

function readRecentSearches(workspaceId?: string) {
  if (!workspaceId) return [];

  try {
    const value = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const searches = value ? (JSON.parse(value) as RecentSearches) : {};
    return Array.isArray(searches[workspaceId])
      ? searches[workspaceId].filter(
          (query): query is string => typeof query === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

function writeRecentSearch(
  workspaceId: string,
  query: string,
  current: string[],
) {
  const next = [
    query,
    ...current.filter(
      (item) => item.toLocaleLowerCase() !== query.toLocaleLowerCase(),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);

  try {
    const value = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const searches = value ? (JSON.parse(value) as RecentSearches) : {};
    window.localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify({ ...searches, [workspaceId]: next }),
    );
  } catch {
    // Search remains fully usable when browser storage is unavailable.
  }

  return next;
}

function plainHeadline(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusColor(status: string) {
  if (status === 'active') return 'rust';
  if (status === 'locked') return 'green';
  if (status === 'archived') return 'gray';
  return 'dark';
}

function SearchState({
  hasWorkspace,
  isError,
  isLoading,
  query,
  retry,
}: {
  hasWorkspace: boolean;
  isError: boolean;
  isLoading: boolean;
  query: string;
  retry: () => void;
}) {
  if (!hasWorkspace) {
    return (
      <div className={styles.state} role="status">
        <IconSwitchHorizontal size={24} aria-hidden="true" />
        <strong>Choose a workspace to search</strong>
        <span>Global navigation commands remain available above.</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.state} role="status" aria-live="polite">
        <Loader color="rust" size="sm" />
        <strong>Searching this workspace...</strong>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.state} role="alert">
        <strong>Search could not be completed</strong>
        <span>Your workspace is unchanged. Check the connection and retry.</span>
        <Button size="xs" variant="light" color="rust" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (query.trim().length < 2) {
    return (
      <div className={styles.state} role="status">
        <IconSearch size={24} aria-hidden="true" />
        <strong>Keep typing to search</strong>
        <span>Enter at least two characters to search indexed decisions.</span>
      </div>
    );
  }

  return (
    <div className={styles.state} role="status">
      <IconSearch size={24} aria-hidden="true" />
      <strong>No matching decisions</strong>
      <span>Try a decision title, proposal phrase, or a broader term.</span>
    </div>
  );
}

export function GlobalSearch({
  canCreateDecision,
  workspaceId,
  workspaceName,
}: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [debouncedQuery] = useDebouncedValue(query, 250);
  const search = useWorkspaceSearch(workspaceId, debouncedQuery);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const settledQuery = debouncedQuery.trim().toLocaleLowerCase();
  const querySettled = normalizedQuery === settledQuery;

  const navigate = (href: string) => {
    router.push(href);
  };

  const rememberAndNavigate = (
    result: WorkspaceSearchResult,
  ) => {
    const currentQuery = query.trim();

    if (workspaceId && currentQuery.length >= 2) {
      setRecentSearches((current) =>
        writeRecentSearch(workspaceId, currentQuery, current),
      );
    }

    navigate(`/w/${workspaceId}/decisions/${result.decision_id}`);
  };

  const actions = (() => {
    const groups: SpotlightActionGroupData[] = [];
    const commandActions: SpotlightActionData[] = [
      ...(workspaceId
        ? [
            {
              id: 'workspace-overview',
              label: 'Open workspace overview',
              description: workspaceName ?? 'Current workspace',
              leftSection: <IconHome size={18} />,
              keywords: ['home', 'dashboard', 'workspace'],
              onClick: () => navigate(`/w/${workspaceId}`),
            },
            {
              id: 'workspace-decisions',
              label: 'Open all decisions',
              description: workspaceName ?? 'Current workspace',
              leftSection: <IconVocabulary size={18} />,
              keywords: ['decision', 'list', 'workspace'],
              onClick: () => navigate(`/w/${workspaceId}/decisions`),
            },
          ]
        : []),
      ...(workspaceId && canCreateDecision
        ? [
            {
              id: 'create-decision',
              label: 'Create a decision',
              description: 'Start a new decision in this workspace',
              leftSection: <IconPlus size={18} />,
              keywords: ['new', 'add', 'decision'],
              onClick: () => navigate(`/w/${workspaceId}/decisions/new`),
            },
          ]
        : []),
      {
        id: 'notifications',
        label: 'Open notifications',
        description: 'Review your attention inbox',
        leftSection: <IconBell size={18} />,
        keywords: ['attention', 'inbox', 'unread'],
        onClick: () => navigate('/notifications'),
      },
      {
        id: 'switch-workspace',
        label: 'Switch workspace',
        description: 'Choose another ForkRoom workspace',
        leftSection: <IconSwitchHorizontal size={18} />,
        keywords: ['workspace', 'change', 'choose'],
        onClick: () => navigate('/workspaces'),
      },
    ];

    const matchingCommands = normalizedQuery
      ? commandActions.filter((action) => {
          const terms = [
            action.label,
            action.description,
            ...(Array.isArray(action.keywords)
              ? action.keywords
              : [action.keywords]),
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase();

          return terms.includes(normalizedQuery);
        })
      : commandActions;

    if (matchingCommands.length > 0) {
      groups.push({ group: 'COMMANDS', actions: matchingCommands });
    }

    if (!normalizedQuery && workspaceId && recentSearches.length > 0) {
      groups.push({
        group: 'RECENT SEARCHES',
        actions: recentSearches.map((recentQuery, index) => ({
          id: `recent-${index}-${recentQuery}`,
          label: recentQuery,
          description: `Search ${workspaceName ?? 'this workspace'} again`,
          leftSection: <IconClock size={18} />,
          closeSpotlightOnTrigger: false,
          onClick: () => setQuery(recentQuery),
        })),
      });
    }

    const searchRequested = Boolean(
      workspaceId && normalizedQuery.length >= 2,
    );

    if (
      searchRequested &&
      (!querySettled || search.isPending || search.isFetching)
    ) {
      groups.push({
        group: 'SEARCH STATUS',
        actions: [
          {
            id: 'search-loading',
            label: 'Searching this workspace...',
            description: 'Checking indexed decisions and proposal text',
            leftSection: <Loader color="rust" size="xs" />,
            closeSpotlightOnTrigger: false,
            onClick: () => undefined,
          },
        ],
      });
    } else if (searchRequested && querySettled && search.isError) {
      groups.push({
        group: 'SEARCH STATUS',
        actions: [
          {
            id: 'search-error',
            label: 'Search could not be completed',
            description: 'Select to retry without leaving this page',
            leftSection: <IconAlertTriangle size={18} />,
            closeSpotlightOnTrigger: false,
            onClick: () => void search.refetch(),
          },
        ],
      });
    }

    if (searchRequested && querySettled && search.data) {
      groups.push({
        group: 'DECISION RESULTS',
        actions:
          search.data.results.length > 0
            ? search.data.results.map((result) => ({
                id: `decision-${result.decision_id}`,
                label: result.title,
                description: [
                  titleCase(result.category),
                  titleCase(result.status),
                  plainHeadline(result.headline),
                ]
                  .filter(Boolean)
                  .join(' · '),
                leftSection: <IconVocabulary size={18} />,
                rightSection: (
                  <Badge
                    color={statusColor(result.status)}
                    size="xs"
                    variant="light"
                  >
                    {result.status}
                  </Badge>
                ),
                onClick: () => rememberAndNavigate(result),
              }))
            : [
                {
                  id: 'search-empty',
                  label: 'No matching decisions',
                  description:
                    'Try a decision title, proposal phrase, or broader term',
                  leftSection: <IconSearch size={18} />,
                  disabled: true,
                },
              ],
      });
    }

    return groups;
  })();

  const isLoading =
    normalizedQuery.length >= 2 &&
    (!querySettled || search.isPending || search.isFetching);

  return (
    <Spotlight
      actions={actions}
      query={query}
      onQueryChange={setQuery}
      filter={(_, availableActions) => availableActions}
      highlightQuery
      shortcut="mod + K"
      onSpotlightOpen={() =>
        setRecentSearches(readRecentSearches(workspaceId))
      }
      scrollable
      maxHeight={520}
      size={680}
      yOffset={72}
      classNames={{
        content: styles.content,
        search: styles.search,
        actionsList: styles.actionsList,
        actionsGroup: styles.actionsGroup,
        action: styles.action,
        actionLabel: styles.actionLabel,
        actionDescription: styles.actionDescription,
      }}
      searchProps={{
        'aria-label': workspaceId
          ? `Search ${workspaceName ?? 'current workspace'}`
          : 'Search ForkRoom commands',
        leftSection: <IconSearch size={19} stroke={1.8} />,
        placeholder: workspaceId
          ? 'Search decisions or run a command...'
          : 'Run a ForkRoom command...',
      }}
      nothingFound={
        <SearchState
          hasWorkspace={Boolean(workspaceId)}
          isError={search.isError}
          isLoading={isLoading}
          query={query}
          retry={() => void search.refetch()}
        />
      }
    />
  );
}
