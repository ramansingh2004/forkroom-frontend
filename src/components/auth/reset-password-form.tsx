'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  PasswordInput,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import {
  Controller,
  useForm,
} from 'react-hook-form';
import {
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react';

import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '@/lib/auth/schema';

import {
  getApiErrorMessage,
  resetPassword,
} from '@/services/auth.service';

import { AuthHeading } from './auth-shell';
import styles from './auth.module.css';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [complete, setComplete] =
    useState(false);

  const {
    control,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(
      resetPasswordSchema,
    ),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit(
    async ({ password }) => {
      if (!token) {
        return;
      }

      setSubmitError(null);

      try {
        await resetPassword(
          token,
          password,
        );

        setComplete(true);
      } catch (error) {
        setSubmitError(
          getApiErrorMessage(
            error,
            'This reset link is invalid or has expired.',
          ),
        );
      }
    },
  );

  if (!token) {
    return (
      <div className={styles.status}>
        <div
          className={`${styles.statusIcon} ${styles.statusIconError}`}
        >
          <IconAlertCircle size={25} />
        </div>

        <h1>Reset link missing</h1>

        <p>
          Open the complete password-reset
          link from your email, or request
          a new one.
        </p>

        <div className={styles.statusActions}>
          <Button
            component={Link}
            href="/forgot-password"
            color="rust"
            fullWidth
          >
            Request a new link
          </Button>

          <Button
            component={Link}
            href="/login"
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

  if (complete) {
    return (
      <div className={styles.status}>
        <div
          className={`${styles.statusIcon} ${styles.statusIconSuccess}`}
        >
          <IconCheck size={25} />
        </div>

        <h1>Password updated</h1>

        <p>
          Your new password is ready.
          Sign in to continue to ForkRoom.
        </p>

        <div className={styles.statusActions}>
          <Button
            component={Link}
            href="/login"
            color="rust"
            fullWidth
          >
            Continue to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        eyebrow="Secure reset"
        title="Choose a new password"
        description="Use at least 8 characters. Your reset link can only be used for this recovery flow."
      />

      <form
        className={styles.form}
        onSubmit={onSubmit}
        noValidate
      >
        {submitError && (
          <Alert
            icon={<IconAlertCircle size={17} />}
            color="red"
            variant="light"
          >
            {submitError}
          </Alert>
        )}

        <div className={styles.fieldStack}>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <PasswordInput
                {...field}
                className={styles.input}
                label="New password"
                autoComplete="new-password"
                error={errors.password?.message}
                disabled={isSubmitting}
                required
              />
            )}
          />

          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <PasswordInput
                {...field}
                className={styles.input}
                label="Confirm new password"
                autoComplete="new-password"
                error={
                  errors.confirmPassword
                    ?.message
                }
                disabled={isSubmitting}
                required
              />
            )}
          />
        </div>

        <Button
          className={styles.submit}
          type="submit"
          color="rust"
          loading={isSubmitting}
          fullWidth
        >
          Set new password
        </Button>
      </form>
    </>
  );
}