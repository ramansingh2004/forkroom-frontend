'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMe,
  logout,
  requestEmailVerification,
  requestPasswordReset,
} from '@/services/auth.service';

export const authKeys = {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: getMe,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useRequestEmailVerification() {
  return useMutation({ mutationFn: requestEmailVerification });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}
