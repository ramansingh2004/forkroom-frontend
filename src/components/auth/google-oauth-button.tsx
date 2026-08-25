'use client';

import Link from 'next/link';
import { Button } from '@mantine/core';
import { IconBrandGoogle } from '@tabler/icons-react';
import { googleOAuthCallbackPath } from '@/lib/auth/navigation';
import { getGoogleOAuthAuthorizeUrl } from '@/services/auth.service';
import styles from './auth.module.css';

type GoogleOAuthButtonProps = {
  mode: 'login' | 'register';
  next: string | null;
};

export function GoogleOAuthButton({ mode, next }: GoogleOAuthButtonProps) {
  const authorizeUrl = getGoogleOAuthAuthorizeUrl(googleOAuthCallbackPath(next));

  return (
    <div className={styles.oauthSection}>
      <Button
        component="a"
        href={authorizeUrl}
        className={styles.oauthButton}
        variant="default"
        leftSection={<IconBrandGoogle size={18} aria-hidden="true" />}
        fullWidth
      >
        Continue with Google
      </Button>

      {mode === 'register' && (
        <p className={styles.oauthTerms}>
          By continuing, you agree to ForkRoom&apos;s <Link href="/terms">Terms</Link> and{' '}
          <Link href="/privacy">Privacy Notice</Link>.
        </p>
      )}

      <div className={styles.authDivider} role="separator">
        <span>or continue with email</span>
      </div>
    </div>
  );
}
