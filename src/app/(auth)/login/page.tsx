import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { LoginForm } from '@/components/auth/login-form';
import { PublicOnly } from '@/components/auth/public-only';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <PublicOnly>
      <Suspense fallback={<Center mih={240}><Loader color="rust" size="sm" /></Center>}>
        <LoginForm />
      </Suspense>
    </PublicOnly>
  );
}