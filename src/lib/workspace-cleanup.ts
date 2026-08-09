const RECENT_SEARCHES_KEY = 'forkroom:recent-searches:v1';

export function clearWorkspaceLocalState(workspaceId: string) {
  try {
    const rawValue = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!rawValue) return;

    const searches = JSON.parse(rawValue) as Record<string, unknown>;
    if (!(workspaceId in searches)) return;

    delete searches[workspaceId];

    if (Object.keys(searches).length === 0) {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
      return;
    }

    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    // Deletion remains authoritative when device-local cleanup is unavailable.
  }
}
