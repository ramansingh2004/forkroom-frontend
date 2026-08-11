import axios from 'axios';

const apiBaseUrl =
  process.env.NEXT_PUBLIC_FORKROOM_API_BASE_URL ??
  'http://localhost:8000/api/v1';

const clientOptions = {
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15_000,
};

export const apiClient = axios.create(clientOptions);
const refreshClient = axios.create(clientOptions);

type RetryableRequest = NonNullable<Parameters<typeof apiClient.request>[0]> & {
  _forkroomRefreshAttempted?: boolean;
};

let refreshPromise: Promise<void> | null = null;

function canRefreshSession(url?: string) {
  if (!url) return false;

  // Authentication mutations handle their own errors. Only /auth/me is a
  // protected session check that should benefit from transparent refresh.
  return !url.includes('/auth/') || url.includes('/auth/me');
}

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<void>('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const request = error.config as RetryableRequest | undefined;

    if (
      !request ||
      request._forkroomRefreshAttempted ||
      !canRefreshSession(request.url)
    ) {
      return Promise.reject(error);
    }

    request._forkroomRefreshAttempted = true;

    try {
      // The backend reads and rotates the HTTP-only refresh cookie. A shared
      // promise prevents concurrent 401 responses from reusing the same
      // one-time refresh token and revoking the entire token family.
      await refreshSession();
      return await apiClient.request(request);
    } catch {
      return Promise.reject(error);
    }
  },
);