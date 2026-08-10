export const DEFAULT_AUTHENTICATED_PATH = '/workspaces';

export function safeNextPath(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  return next;
}

type AuthPathOptions = {
  email?: string | null;
  next?: string | null;
  state?: string | null;
};

export function authPath(pathname: string, options: AuthPathOptions = {}) {
  const search = new URLSearchParams();

  if (options.email?.trim()) {
    search.set('email', options.email.trim().toLowerCase());
  }

  if (options.next) {
    search.set('next', safeNextPath(options.next));
  }

  if (options.state) {
    search.set('state', options.state);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}