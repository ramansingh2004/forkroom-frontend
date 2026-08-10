import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { RegisterForm } from '@/components/auth/register-form';
import { PublicOnly } from '@/components/auth/public-only';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <PublicOnly>
      <Suspense fallback={<Center mih={320}><Loader color="rust" size="sm" /></Center>}>
        <RegisterForm />
      </Suspense>
    </PublicOnly>
  );
}