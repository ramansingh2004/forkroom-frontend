'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, TextInput } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { IconAlertCircle, IconLock, IconMail } from '@tabler/icons-react';
import { authPath } from '@/lib/auth/navigation';
import { emailSchema, type EmailValues } from '@/lib/auth/schema';
import { getApiErrorMessage, requestPasswordReset } from '@/services/auth.service';
import { AuthHeading } from './auth-shell';
import styles from './auth.module.css';

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') ?? '';
  const next = searchParams.get('next');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: initialEmail },
  });

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const onSubmit = handleSubmit(async ({ email }) => {
    setSubmitError(null);

    try {
      await requestPasswordReset(email);
      setSentEmail(email);
      setCooldown(60);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'We could not send a reset link. Please try again.'));
    }
  });

  const resend = async () => {
    if (!sentEmail || cooldown > 0 || resending) return;
    setSubmitError(null);
    setResending(true);

    try {
      await requestPasswordReset(sentEmail);
      setCooldown(60);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'We could not send another reset link.'));
    } finally {
      setResending(false);
    }
  };

  if (sentEmail) {
    return (
      <div className={styles.status} aria-live="polite">
        <div className={styles.statusIcon}><IconMail size={25} /></div>
        <h1>Check your inbox</h1>
        <p>
          If an account exists for <strong>{sentEmail}</strong>, a password reset link has been sent.
        </p>
        <span className={styles.statusSupporting}>
          For privacy, ForkRoom shows this same confirmation for every email address.
        </span>
        {submitError && (
          <Alert icon={<IconAlertCircle size={17} />} color="red" variant="light" w="100%">
            {submitError}
          </Alert>
        )}
        <div className={styles.statusActions}>
          <Button
            color="rust"
            variant="light"
            loading={resending}
            disabled={cooldown > 0}
            onClick={resend}
            fullWidth
          >
            {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send another link'}
          </Button>
          <Button
            variant="subtle"
            color="dark"
            onClick={() => {
              reset({ email: sentEmail });
              setSentEmail(null);
              setSubmitError(null);
            }}
            fullWidth
          >
            Use another email
          </Button>
          <Button component={Link} href={authPath('/login', { email: sentEmail, next })} color="rust" fullWidth>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        eyebrow="Account recovery"
        title="Reset your password"
        description="Enter your email and we will send a secure reset link if an account exists."
      />
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {submitError && (
          <Alert icon={<IconAlertCircle size={17} />} color="red" variant="light">{submitError}</Alert>
        )}
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              className={styles.input}
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              disabled={isSubmitting}
              required
            />
          )}
        />
        <Button className={styles.submit} type="submit" color="rust" loading={isSubmitting} fullWidth>
          Send reset link
        </Button>
        <p className={styles.securityNote}>
          <IconLock size={14} aria-hidden="true" />
          Reset links are sent privately and should not be shared.
        </p>
        <p className={styles.secondary}>
          <Link href={authPath('/login', { email: initialEmail, next })} className={styles.textLink}>
            Back to sign in
          </Link>
        </p>
      </form>
    </>
  );
}