import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { VerifyEmailPanel } from '@/components/auth/verify-email-panel';

export const metadata: Metadata = { title: 'Verify email' };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Center mih={240}><Loader color="rust" size="sm" /></Center>}>
      <VerifyEmailPanel />
    </Suspense>
  );
}