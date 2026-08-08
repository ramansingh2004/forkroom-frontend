'use client';

import { useEffect } from 'react';
import { Center, Loader } from '@mantine/core';
import { useRouter } from 'next/navigation';

import { useCurrentUser } from '@/hooks/use-auth';
import { DEFAULT_AUTHENTICATED_PATH } from '@/lib/auth/navigation';

export function PublicOnly({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();

  const {
    data: user,
    isPending,
  } = useCurrentUser();

  useEffect(() => {
    if (user) {
      router.replace(DEFAULT_AUTHENTICATED_PATH);
    }
  }, [router, user]);

  if (isPending || user) {
    return (
      <Center mih={240}>
        <Loader
          color="rust"
          size="sm"
        />
      </Center>
    );
  }

  return children;
}