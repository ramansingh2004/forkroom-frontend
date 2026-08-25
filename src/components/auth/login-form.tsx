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
import { GoogleOAuthButton } from './google-oauth-button';
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
    <div className={styles.loginExperience}>
      <section className={styles.loginVisual} aria-label="ForkRoom collaborative decision workspace">
        <div className={styles.visualWash} aria-hidden="true" />

        <div className={styles.visualTopline}>
          <span className={styles.visualKicker}>Decisions, with context</span>
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} aria-hidden="true" />
            Live collaboration
          </span>
        </div>

        <div className={styles.visualCopy}>
          <h2>Move from discussion to a decision everyone can trust.</h2>
          <p>
            Keep proposals, evidence, objections, votes, and the final reasoning in one shared room.
          </p>
        </div>

        <div className={styles.visualScene} aria-hidden="true">
          <div className={styles.sceneGlow} />

          <article className={styles.decisionPreview}>
            <div className={styles.previewHeader}>
              <div>
                <span className={styles.previewLabel}>Decision room</span>
                <strong>API authentication strategy</strong>
              </div>
              <span className={styles.activeState}>Active</span>
            </div>

            <div className={styles.decisionPath}>
              <span className={styles.pathStepDone}>Draft</span>
              <span className={styles.pathLineDone} />
              <span className={styles.pathStepCurrent}>Active</span>
              <span className={styles.pathLine} />
              <span>Vote</span>
              <span className={styles.pathLine} />
              <span>Locked</span>
            </div>

            <div className={styles.previewBody}>
              <div className={styles.proposalRow}>
                <span className={styles.proposalIcon}>P1</span>
                <div>
                  <strong>Short-lived access + rotating refresh tokens</strong>
                  <span>Leading proposal · 4 evidence links</span>
                </div>
                <span className={styles.signal}>+8</span>
              </div>

              <div className={styles.proposalRow}>
                <span className={styles.proposalIconMuted}>P2</span>
                <div>
                  <strong>Server-side session store</strong>
                  <span>Alternative · 2 open comments</span>
                </div>
                <span className={styles.signalMuted}>+3</span>
              </div>
            </div>

            <div className={styles.previewFooter}>
              <div className={styles.avatarStack}>
                <span>RS</span>
                <span>AK</span>
                <span>MN</span>
                <span>+5</span>
              </div>
              <span>8 participants · 2 proposals</span>
            </div>
          </article>

          <div className={`${styles.floatingCard} ${styles.voteFloat}`}>
            <span className={styles.floatIcon}>✓</span>
            <div>
              <strong>Voting ready</strong>
              <span>Quorum reached · 6/8</span>
            </div>
          </div>

          <div className={`${styles.floatingCard} ${styles.evidenceFloat}`}>
            <span className={styles.evidencePulse} />
            <div>
              <strong>Evidence linked</strong>
              <span>Security review.pdf</span>
            </div>
          </div>

          <div className={`${styles.floatingCard} ${styles.commentFloat}`}>
            <span className={styles.commentAvatar}>JS</span>
            <div>
              <strong>New reasoning added</strong>
              <span>“This keeps revocation predictable.”</span>
            </div>
          </div>
        </div>

        <div className={styles.visualFooter}>
          <span>Proposal → Discuss → Vote → Lock</span>
          <span>Built for durable decisions</span>
        </div>
      </section>

      <section className={styles.loginFormPane}>
        <div className={styles.loginFormInner}>
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

            <GoogleOAuthButton mode="login" next={next} />

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
        </div>
      </section>
    </div>
  );
}
