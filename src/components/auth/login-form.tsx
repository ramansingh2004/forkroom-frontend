'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, PasswordInput, TextInput } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { authKeys } from '@/hooks/use-auth';
import { authPath, safeNextPath } from '@/lib/auth/navigation';
import { loginSchema, type LoginValues } from '@/lib/auth/schema';
import { getApiErrorMessage, getMe, login } from '@/services/auth.service';
import { AuthHeading } from './auth-shell';
import styles from './auth.module.css';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const next = searchParams.get('next');
  const state = searchParams.get('state');
  const email = searchParams.get('email') ?? '';
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email, password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setVerificationEmail(null);

    try {
      await login(values);

      // Confirm that the browser accepted the HTTP-only cookies before the UI
      // treats the user as authenticated and starts workspace requests.
      const user = await getMe();
      queryClient.setQueryData(authKeys.me, user);
      router.replace(safeNextPath(searchParams.get('next')));
    } catch (error) {
      const message = getApiErrorMessage(error, 'Email or password is incorrect.');
      setSubmitError(message);

      if (/unverified|verify your email|email verification/i.test(message)) {
        setVerificationEmail(values.email);
      }
    }
  });

  const registerHref = authPath('/register', { next });
  const forgotHref = authPath('/forgot-password', { email, next });

  return (
    <>
      <AuthHeading
        eyebrow="Welcome back"
        title="Sign in to ForkRoom"
        description="Return to the decisions and reasoning your team is working through."
      />

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {(state === 'verified' || state === 'password-reset') && (
          <Alert icon={<IconCircleCheck size={17} />} color="green" variant="light">
            {state === 'verified'
              ? 'Email verified. Sign in to continue.'
              : 'Password updated. Sign in with your new password.'}
          </Alert>
        )}

        {submitError && (
          <Alert icon={<IconAlertCircle size={17} />} color="red" variant="light">
            <span>{submitError}</span>
            {verificationEmail && (
              <>
                {' '}
                <Link
                  href={authPath('/verify-email', {
                    email: verificationEmail,
                    next,
                  })}
                  className={styles.textLink}
                >
                  Resend verification
                </Link>
              </>
            )}
          </Alert>
        )}

        <div className={styles.fieldStack}>
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
                placeholder="raman@example.com"
                error={errors.email?.message}
                disabled={isSubmitting}
                required
              />
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <PasswordInput
                {...field}
                className={styles.input}
                label="Password"
                autoComplete="current-password"
                error={errors.password?.message}
                disabled={isSubmitting}
                required
              />
            )}
          />
        </div>

        <div className={styles.formMeta}>
          <span>Session ends when you sign out.</span>
          <Link href={forgotHref} className={styles.textLink}>
            Forgot password?
          </Link>
        </div>

        <Button className={styles.submit} type="submit" color="rust" loading={isSubmitting} fullWidth>
          Sign in
        </Button>

        <p className={styles.secondary}>
          New to ForkRoom?{' '}
          <Link href={registerHref} className={styles.textLink}>
            Create an account
          </Link>
        </p>
      </form>
    </>
  );
}