'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Checkbox, PasswordInput, TextInput } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { IconAlertCircle } from '@tabler/icons-react';
import { authPath } from '@/lib/auth/navigation';
import { registerSchema, type RegisterValues } from '@/lib/auth/schema';
import { getApiErrorMessage, register, requestEmailVerification } from '@/services/auth.service';
import { AuthHeading } from './auth-shell';
import styles from './auth.module.css';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { display_name: '', email: '', password: '', terms: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await register({
        display_name: values.display_name,
        email: values.email,
        password: values.password,
      });

      let state = 'verification-sent';

      try {
        await requestEmailVerification(values.email);
      } catch {
        state = 'delivery-failed';
      }

      router.push(
        authPath('/verify-email', {
          email: values.email,
          next,
          state,
        }),
      );
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'We could not create your account. Please try again.'));
    }
  });

  return (
    <>
      <AuthHeading
        eyebrow="Create account"
        title="Start with a clear decision"
        description="Create your ForkRoom account, verify your email, then open your first workspace."
      />

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {submitError && (
          <Alert icon={<IconAlertCircle size={17} />} color="red" variant="light">
            {submitError}
          </Alert>
        )}

        <div className={styles.fieldStack}>
          <Controller
            name="display_name"
            control={control}
            render={({ field }) => (
              <TextInput
                {...field}
                className={styles.input}
                label="Name"
                autoComplete="name"
                placeholder="Raman Singh"
                error={errors.display_name?.message}
                disabled={isSubmitting}
                required
              />
            )}
          />

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
                description="Use at least 8 characters."
                autoComplete="new-password"
                error={errors.password?.message}
                disabled={isSubmitting}
                required
              />
            )}
          />
        </div>

        <div>
          <Controller
            name="terms"
            control={control}
            render={({ field }) => (
              <Checkbox
                className={styles.terms}
                checked={field.value}
                onChange={(event) => field.onChange(event.currentTarget.checked)}
                label={
                  <span>
                    I agree to ForkRoom&apos;s <Link href="/terms">Terms</Link> and{' '}
                    <Link href="/privacy">Privacy Notice</Link>.
                  </span>
                }
                disabled={isSubmitting}
              />
            )}
          />
          {errors.terms?.message && <p className={styles.termsError}>{errors.terms.message}</p>}
        </div>

        <Button className={styles.submit} type="submit" color="rust" loading={isSubmitting} fullWidth>
          Create account
        </Button>

        <p className={styles.secondary}>
          Already have an account?{' '}
          <Link href={authPath('/login', { next })} className={styles.textLink}>
            Sign in
          </Link>
        </p>
      </form>
    </>
  );
}