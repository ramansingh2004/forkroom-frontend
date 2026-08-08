'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  TextInput,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Controller,
  useForm,
} from 'react-hook-form';
import {
  IconAlertCircle,
  IconMail,
} from '@tabler/icons-react';

import {
  emailSchema,
  type EmailValues,
} from '@/lib/auth/schema';

import {
  getApiErrorMessage,
  requestPasswordReset,
} from '@/services/auth-services';

import { AuthHeading } from './auth-shell';
import styles from './auth.module.css';

export function ForgotPasswordForm() {
  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = handleSubmit(
    async ({ email }) => {
      setSubmitError(null);

      try {
        await requestPasswordReset(email);
        setSent(true);
      } catch (error) {
        setSubmitError(
          getApiErrorMessage(
            error,
            'We could not send a reset link. Please try again.',
          ),
        );
      }
    },
  );

  if (sent) {
    return (
      <div className={styles.status}>
        <div className={styles.statusIcon}>
          <IconMail size={25} />
        </div>

        <h1>Check your inbox</h1>

        <p>
          If an account exists for that email,
          a password reset link has been sent.
        </p>

        <div className={styles.statusActions}>
          <Button
            component={Link}
            href="/login"
            color="rust"
            fullWidth
          >
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

        <Button
          className={styles.submit}
          type="submit"
          color="rust"
          loading={isSubmitting}
          fullWidth
        >
          Send reset link
        </Button>

        <p className={styles.secondary}>
          <Link
            href="/login"
            className={styles.textLink}
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </>
  );
}