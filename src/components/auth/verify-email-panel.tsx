'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert, Button } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconAlertCircle, IconCheck, IconMail } from '@tabler/icons-react';
import { authPath } from '@/lib/auth/navigation';
import {
  confirmEmailVerification,
  getApiErrorMessage,
  requestEmailVerification,
} from '@/services/auth.service';
import styles from './auth.module.css';

type VerifyState = 'waiting' | 'verifying' | 'verified' | 'error';

export function VerifyEmailPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const next = searchParams.get('next');
  const initialState = searchParams.get('state');
  const attemptedToken = useRef<string | null>(null);
  const [state, setState] = useState<VerifyState>(
    token ? 'verifying' : initialState === 'verified' ? 'verified' : 'waiting',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(initialState === 'verification-sent' ? 60 : 0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!token || attemptedToken.current === token) return;
    attemptedToken.current = token;

    void confirmEmailVerification(token)
      .then((result) => {
        setMessage(result.detail);
        setState('verified');
        router.replace(
          authPath('/verify-email', {
            email,
            next,
            state: 'verified',
          }),
        );
      })
      .catch((error) => {
        setMessage(getApiErrorMessage(error, 'This verification link is invalid or has expired.'));
        setState('error');
      });
  }, [email, next, router, token]);

  const resend = async () => {
    if (!email) return;
    setResending(true);
    setMessage(null);

    try {
      const result = await requestEmailVerification(email);
      setMessage(result.detail);
      setCooldown(60);
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'We could not send another verification email.'));
    } finally {
      setResending(false);
    }
  };

  if (state === 'verifying') {
    return (
      <div className={styles.status} aria-live="polite">
        <div className={styles.statusIcon}><IconMail size={25} /></div>
        <h1>Verifying your email</h1>
        <p>We are checking the secure link. This should only take a moment.</p>
        <Button color="rust" loading fullWidth>Verifying</Button>
      </div>
    );
  }

  if (state === 'verified') {
    return (
      <div className={styles.status} aria-live="polite">
        <div className={`${styles.statusIcon} ${styles.statusIconSuccess}`}><IconCheck size={25} /></div>
        <h1>Email verified</h1>
        <p>{message ?? 'Your email is confirmed. You can now sign in to ForkRoom.'}</p>
        <div className={styles.statusActions}>
          <Button
            component={Link}
            href={authPath('/login', { email, next, state: 'verified' })}
            color="rust"
            fullWidth
          >
            Continue to sign in
          </Button>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={styles.status} aria-live="polite">
        <div className={`${styles.statusIcon} ${styles.statusIconError}`}><IconAlertCircle size={25} /></div>
        <h1>Link could not be verified</h1>
        <p>{message}</p>
        <div className={styles.statusActions}>
          {email && (
            <Button
              color="rust"
              loading={resending}
              disabled={cooldown > 0}
              onClick={resend}
              fullWidth
            >
              {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send a new link'}
            </Button>
          )}
          <Button
            component={Link}
            href={authPath('/login', { email, next })}
            variant="subtle"
            color="dark"
            fullWidth
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.status} aria-live="polite">
      <div className={styles.statusIcon}><IconMail size={25} /></div>
      <h1>Check your email</h1>
      <p>
        We sent a verification link{email ? ` to ${email}` : ''}. Open it to confirm your account.
      </p>
      {initialState === 'delivery-failed' && (
        <Alert icon={<IconAlertCircle size={17} />} color="orange" variant="light" w="100%">
          Your account was created, but the first email could not be sent. Use resend below; do not
          register again.
        </Alert>
      )}
      {message && <Alert color="blue" variant="light" w="100%">{message}</Alert>}
      <div className={styles.statusActions}>
        {email && (
          <Button
            variant="light"
            color="rust"
            loading={resending}
            disabled={cooldown > 0}
            onClick={resend}
            fullWidth
          >
            {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification'}
          </Button>
        )}
        <Button
          component={Link}
          href={authPath('/login', { email, next })}
          variant="subtle"
          color="dark"
          fullWidth
        >
          Back to sign in
        </Button>
        <Link href={authPath('/register', { next })} className={styles.textLink}>
          Use a different email
        </Link>
      </div>
    </div>
  );
}