export const DEFAULT_AUTHENTICATED_PATH = '/workspaces';

export function safeNextPath(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  return next;
}