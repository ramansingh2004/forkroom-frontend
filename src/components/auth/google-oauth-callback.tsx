'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Alert, Button, Loader } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  IconAlertCircle,
  IconBrandGoogle,
  IconCircleCheck,
} from '@tabler/icons-react';
import { authKeys } from '@/hooks/use-auth';
import { authPath, safeNextPath } from '@/lib/auth/navigation';
import {
  getApiErrorMessage,
  getApiStatus,
  getMe,
} from '@/services/auth.service';
import styles from './auth.module.css';

const oauthErrorMessages: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled. No changes were made to your ForkRoom account.',
  oauth_failed: 'Google could not complete the sign-in request. Try again or use your email and password.',
};

export function GoogleOAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const provider = searchParams.get('oauth');
  const status = searchParams.get('status');
  const oauthError = searchParams.get('error');
  const shouldConfirmSession = provider === 'google' && status === 'success' && !oauthError;
  const currentUser = useQuery({
    queryKey: authKeys.me,
    queryFn: getMe,
    enabled: shouldConfirmSession,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (currentUser.data) {
      router.replace(next);
    }
  }, [currentUser.data, next, router]);

  const loginHref = authPath('/login', { next });

  if (oauthError) {
    return (
      <div className={styles.oauthCallback} role="alert">
        <span className={styles.statusIconError}>
          <IconAlertCircle size={25} aria-hidden="true" />
        </span>
        <h1>Google sign-in was not completed</h1>
        <p>{oauthErrorMessages[oauthError] ?? oauthErrorMessages.oauth_failed}</p>
        <Button component={Link} href={loginHref} variant="default" fullWidth>
          Back to sign in
        </Button>
      </div>
    );
  }

  if (!shouldConfirmSession) {
    return (
      <div className={styles.oauthCallback} role="alert">
        <span className={styles.statusIconError}>
          <IconAlertCircle size={25} aria-hidden="true" />
        </span>
        <h1>Invalid sign-in response</h1>
        <p>ForkRoom could not verify this Google sign-in response. Start a new sign-in attempt.</p>
        <Button component={Link} href={loginHref} variant="default" fullWidth>
          Return to sign in
        </Button>
      </div>
    );
  }

  if (currentUser.isError) {
    const message =
      getApiStatus(currentUser.error) === 401
        ? 'Google approved the sign-in, but ForkRoom could not establish the browser session. Confirm that the frontend and API use HTTPS, then try again.'
        : getApiErrorMessage(
            currentUser.error,
            'ForkRoom could not verify the new Google session. Try again.',
          );

    return (
      <div className={styles.oauthCallback} role="alert">
        <span className={styles.statusIconError}>
          <IconAlertCircle size={25} aria-hidden="true" />
        </span>
        <h1>Session verification failed</h1>
        <p>{message}</p>
        <div className={styles.statusActions}>
          <Button color="rust" onClick={() => currentUser.refetch()} fullWidth>
            Verify session again
          </Button>
          <Button component={Link} href={loginHref} variant="default" fullWidth>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.oauthCallback} aria-live="polite">
      <span className={`${styles.statusIcon} ${styles.statusIconSuccess}`}>
        {currentUser.data ? (
          <IconCircleCheck size={25} aria-hidden="true" />
        ) : (
          <IconBrandGoogle size={25} aria-hidden="true" />
        )}
      </span>
      <h1>{currentUser.data ? 'Google sign-in complete' : 'Completing Google sign-in'}</h1>
      <p>
        {currentUser.data
          ? 'Your secure ForkRoom session is ready. Taking you back to your workspace.'
          : 'ForkRoom is verifying the secure session created by Google.'}
      </p>
      <Loader color="rust" size="sm" aria-label="Verifying Google sign-in" />
    </div>
  );
}
