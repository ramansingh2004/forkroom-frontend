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
import { GoogleOAuthButton } from './google-oauth-button';
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
    <div className={styles.registerExperience}>
      <section className={styles.registerVisual} aria-label="ForkRoom workspace setup preview">
        <div className={styles.registerVisualWash} aria-hidden="true" />

        <div className={styles.registerTopline}>
          <span className={styles.registerKicker}>Start with shared context</span>
          <span className={styles.setupBadge}>
            <span className={styles.setupBadgeMark} aria-hidden="true">+</span>
            Workspace setup
          </span>
        </div>

        <div className={styles.registerCopy}>
          <h2>Create the room where your team&apos;s next decision can actually move forward.</h2>
          <p>
            Bring the people, options, evidence, and ownership together before the discussion gets scattered.
          </p>
        </div>

        <div className={styles.registerScene} aria-hidden="true">
          <div className={styles.registerSceneGlow} />

          <article className={styles.workspacePreview}>
            <div className={styles.workspacePreviewHeader}>
              <div>
                <span className={styles.registerPreviewLabel}>New workspace</span>
                <strong>Product &amp; Engineering</strong>
              </div>
              <span className={styles.workspaceReady}>Setup</span>
            </div>

            <div className={styles.workspaceProgress}>
              <span className={styles.workspaceProgressFill} />
            </div>

            <div className={styles.setupSteps}>
              <div className={`${styles.setupStep} ${styles.setupStepComplete}`}>
                <span className={styles.setupStepIcon}>01</span>
                <div>
                  <strong>Workspace created</strong>
                  <span>Ownership and defaults are ready.</span>
                </div>
                <span className={styles.setupCheck}>✓</span>
              </div>

              <div className={`${styles.setupStep} ${styles.setupStepActive}`}>
                <span className={styles.setupStepIcon}>02</span>
                <div>
                  <strong>Invite the people who decide</strong>
                  <span>Editors, voters, and observers.</span>
                </div>
                <div className={styles.setupMiniAvatars}>
                  <span>AS</span>
                  <span>NK</span>
                  <span>+3</span>
                </div>
              </div>

              <div className={styles.setupStep}>
                <span className={styles.setupStepIcon}>03</span>
                <div>
                  <strong>Open your first decision</strong>
                  <span>Add the question, proposals, and context.</span>
                </div>
                <span className={styles.setupArrow}>→</span>
              </div>
            </div>
          </article>

          <div className={`${styles.registerFloatCard} ${styles.inviteFloat}`}>
            <span className={styles.inviteAvatar}>AM</span>
            <div>
              <strong>Aarav joined</strong>
              <span>Editor · just now</span>
            </div>
          </div>

          <div className={`${styles.registerFloatCard} ${styles.firstDecisionFloat}`}>
            <span className={styles.decisionSpark}>✦</span>
            <div>
              <strong>First decision drafted</strong>
              <span>Q4 release scope</span>
            </div>
          </div>

          <div className={`${styles.registerFloatCard} ${styles.contextFloat}`}>
            <span className={styles.contextStack}>
              <i />
              <i />
              <i />
            </span>
            <div>
              <strong>Context attached</strong>
              <span>3 docs · 1 design · 2 links</span>
            </div>
          </div>
        </div>

        <div className={styles.registerVisualFooter}>
          <span>Create → Invite → Decide</span>
          <span>Your reasoning stays with the outcome</span>
        </div>
      </section>

      <section className={styles.registerFormPane}>
        <div className={styles.registerFormInner}>
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

            <GoogleOAuthButton mode="register" next={next} />

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
        </div>
      </section>
    </div>
  );
}