import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { PublicOnly } from '@/components/auth/public-only';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <PublicOnly>
      <Suspense fallback={<Center mih={280}><Loader color="rust" size="sm" /></Center>}>
        <ForgotPasswordForm />
      </Suspense>
    </PublicOnly>
  );
}