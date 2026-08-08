import { NextResponse } from 'next/server';
import type { LoginBackendResponse, TokenBackendResponse } from './types';

export const ACCESS_COOKIE = 'forkroom_access';
export const REFRESH_COOKIE = 'forkroom_refresh';

const backendBaseUrl = (
  process.env.FORKROOM_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1'
).replace(/\/$/, '');

export type BackendResult<T> = {
  data: T;
  status: number;
};

export async function backendRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  const contentType = response.headers.get('content-type');
  const data = contentType?.includes('application/json')
    ? await response.json()
    : await response.text();

  return { data: data as T, status: response.status } satisfies BackendResult<T>;
}

export function backendJson(data: unknown, status: number) {
  return NextResponse.json(data, { status });
}

export function setAuthCookies(
  response: NextResponse,
  tokens: LoginBackendResponse | TokenBackendResponse,
) {
  const secure = process.env.NODE_ENV === 'production';
  const baseOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
  };

  response.cookies.set(ACCESS_COOKIE, tokens.access_token, {
    ...baseOptions,
    maxAge: Math.max(1, tokens.expires_in),
  });

  // The backend contract does not expose refresh-token lifetime, so this stays
  // a browser-session cookie instead of inventing a client-side expiry.
  response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, baseOptions);
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
  response.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
}