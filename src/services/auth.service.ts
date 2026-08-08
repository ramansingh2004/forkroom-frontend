import axios from 'axios';
import { apiClient } from '@/lib/api/client';
import type { components } from '@/lib/api/generated/api-types';

type LoginRequest = components['schemas']['LoginRequest'];
type LoginResponse = components['schemas']['LoginResponse'];
type RegisterRequest = components['schemas']['RegisterRequest'];
type User = components['schemas']['UserResponse'];
type MessageResponse = components['schemas']['MessageResponse'];
type FastApiValidationError = components['schemas']['ValidationError'];

export async function login(payload: LoginRequest) {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data.user;
}

export async function register(payload: RegisterRequest) {
  const { data } = await apiClient.post<User>('/auth/register', payload);
  return data;
}

export async function getMe() {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

export async function requestEmailVerification(email: string) {
  const { data } = await apiClient.post<MessageResponse>('/auth/email-verification/request', {
    email,
  });
  return data;
}

export async function confirmEmailVerification(token: string) {
  const { data } = await apiClient.post<MessageResponse>('/auth/email-verification/confirm', {
    token,
  });
  return data;
}

export async function requestPasswordReset(email: string) {
  const { data } = await apiClient.post<MessageResponse>('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token: string, newPassword: string) {
  const { data } = await apiClient.post<MessageResponse>('/auth/reset-password', {
    token,
    new_password: newPassword,
  });
  return data;
}

type ApiErrorBody = {
  detail?: string | FastApiValidationError[];
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return fallback;
  }

  if (!error.response) {
    return 'ForkRoom could not reach the server. Check your connection and try again.';
  }

  if (error.response.status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  const detail = error.response.data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const firstMessage = detail.find((item) => item.msg)?.msg;
    if (firstMessage) return firstMessage;
  }

  return fallback;
}

export function getApiStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}