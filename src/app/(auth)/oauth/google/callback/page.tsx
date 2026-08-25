import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { GoogleOAuthCallback } from '@/components/auth/google-oauth-callback';

export const metadata: Metadata = { title: 'Google sign-in' };

export default function GoogleOAuthCallbackPage() {
  return (
    <Suspense fallback={<Center mih={240}><Loader color="rust" size="sm" /></Center>}>
      <GoogleOAuthCallback />
    </Suspense>
  );
}
