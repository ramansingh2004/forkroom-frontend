'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert, Button } from '@mantine/core';
import { useSearchParams } from 'next/navigation';
import { IconAlertCircle, IconCheck, IconMail } from '@tabler/icons-react';
import {
  confirmEmailVerification,
  getApiErrorMessage,
  requestEmailVerification,
} from '@/services/auth-services';
import styles from './auth.module.css';

type VerifyState = 'waiting' | 'verifying' | 'verified' | 'error';

export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const attemptedToken = useRef<string | null>(null);
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'waiting');
  const [message, setMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token || attemptedToken.current === token) return;
    attemptedToken.current = token;

    void confirmEmailVerification(token)
      .then((result) => {
        setMessage(result.detail);
        setState('verified');
      })
      .catch((error) => {
        setMessage(getApiErrorMessage(error, 'This verification link is invalid or has expired.'));
        setState('error');
      });
  }, [token]);

  const resend = async () => {
    if (!email) return;
    setResending(true);
    setMessage(null);

    try {
      const result = await requestEmailVerification(email);
      setMessage(result.detail);
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
          <Button component={Link} href="/login" color="rust" fullWidth>Continue to sign in</Button>
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
          {email && <Button color="rust" loading={resending} onClick={resend} fullWidth>Send a new link</Button>}
          <Button component={Link} href="/login" variant="subtle" color="dark" fullWidth>Back to sign in</Button>
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
      {message && <Alert color="blue" variant="light" w="100%">{message}</Alert>}
      <div className={styles.statusActions}>
        {email && <Button variant="light" color="rust" loading={resending} onClick={resend} fullWidth>Resend verification</Button>}
        <Button component={Link} href="/login" variant="subtle" color="dark" fullWidth>Back to sign in</Button>
      </div>
    </div>
  );
}