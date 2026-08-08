'use client';

import { useEffect } from 'react';
import { Button, Loader } from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-auth';
import { getApiStatus } from '@/services/auth.service';
import styles from './auth.module.css';

export function AuthBoundary({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const unauthorized = user.isError && getApiStatus(user.error) === 401;

  useEffect(() => {
    if (unauthorized) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, unauthorized]);

  if (user.isPending || unauthorized) {
    return (
      <div className={styles.boundary}>
        <Loader color="rust" size="sm" />
      </div>
    );
  }

  if (user.isError) {
    return (
      <div className={styles.boundary}>
        <div className={styles.boundaryCard}>
          <strong>We could not verify your session.</strong>
          <span>ForkRoom may be temporarily unavailable. Your page has not been changed.</span>
          <Button variant="light" color="rust" onClick={() => user.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return children;
}