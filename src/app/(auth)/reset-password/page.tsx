import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { PublicOnly } from '@/components/auth/public-only';

export const metadata: Metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return (
    <PublicOnly>
      <Suspense fallback={<Center mih={240}><Loader color="rust" size="sm" /></Center>}>
        <ResetPasswordForm />
      </Suspense>
    </PublicOnly>
  );
}