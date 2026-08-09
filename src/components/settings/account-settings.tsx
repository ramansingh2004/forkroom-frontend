'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconAt,
  IconCalendar,
  IconCheck,
  IconDeviceDesktop,
  IconKey,
  IconLock,
  IconLogout,
  IconMailForward,
  IconShieldCheck,
  IconUser,
} from '@tabler/icons-react';
import {
  useCurrentUser,
  useLogout,
  useRequestEmailVerification,
  useRequestPasswordReset,
} from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/services/auth.service';
import styles from './account-settings.module.css';

type AccountSettingsProps = {
  section: 'profile' | 'security';
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

export function AccountSettings({ section }: AccountSettingsProps) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const verification = useRequestEmailVerification();
  const passwordReset = useRequestPasswordReset();
  const logout = useLogout();

  if (currentUser.isPending) {
    return (
      <div className={styles.centerState}>
        <Loader color="rust" size="sm" />
        <span>Loading account settings...</span>
      </div>
    );
  }

  if (currentUser.isError || !currentUser.data) {
    return (
      <div className={styles.accountPage}>
        <Alert color="red" title="Account settings unavailable">
          ForkRoom could not verify the current account. Retry after checking
          your connection.
        </Alert>
        <Button
          className={styles.retryButton}
          variant="light"
          color="rust"
          onClick={() => void currentUser.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const user = currentUser.data;
  const initials =
    user.display_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'FR';

  const resendVerification = async () => {
    try {
      await verification.mutateAsync(user.email);
      notifications.show({
        color: 'green',
        title: 'Verification email requested',
        message: 'Check your inbox for a fresh verification link.',
      });
    } catch {
      // The inline error keeps this action and its retry context together.
    }
  };

  const sendPasswordReset = async () => {
    try {
      await passwordReset.mutateAsync(user.email);
      notifications.show({
        color: 'green',
        title: 'Password reset requested',
        message: 'Check your inbox for the secure reset link.',
      });
    } catch {
      // The inline error keeps this action and its retry context together.
    }
  };

  const signOut = async () => {
    try {
      await logout.mutateAsync();
      router.replace('/login');
    } catch {
      // The session remains active and the error is shown in this section.
    }
  };

  return (
    <div className={styles.accountPage}>
      <header className={styles.accountHeader}>
        <div>
          <span className={styles.eyebrow}>PERSONAL SETTINGS</span>
          <h1>{section === 'profile' ? 'Profile' : 'Security'}</h1>
          <p>
            {section === 'profile'
              ? 'Review the personal identity attached to your ForkRoom account.'
              : 'Protect access to your account and manage this browser session.'}
          </p>
        </div>
        <Badge
          color={user.is_active ? 'green' : 'gray'}
          variant="light"
          leftSection={<IconShieldCheck size={13} />}
        >
          {user.is_active ? 'Active account' : 'Inactive account'}
        </Badge>
      </header>

      <div className={styles.accountLayout}>
        <nav className={styles.accountNav} aria-label="Personal settings">
          <Link
            href="/settings/profile"
            className={section === 'profile' ? styles.activeNav : undefined}
            aria-current={section === 'profile' ? 'page' : undefined}
          >
            <IconUser size={17} aria-hidden="true" />
            Profile
          </Link>
          <Link
            href="/settings/security"
            className={section === 'security' ? styles.activeNav : undefined}
            aria-current={section === 'security' ? 'page' : undefined}
          >
            <IconLock size={17} aria-hidden="true" />
            Security
          </Link>
        </nav>

        <main className={styles.accountContent}>
          {section === 'profile' ? (
            <>
              <section className={styles.settingsSection}>
                <div className={styles.sectionHeading}>
                  <span>01</span>
                  <div>
                    <h2>Personal identity</h2>
                    <p>
                      This is the identity other members see in shared
                      workspaces and decision records.
                    </p>
                  </div>
                </div>

                <div className={styles.identityCard}>
                  <Avatar
                    src={user.avatar_url}
                    color="rust"
                    size={64}
                    radius="xl"
                  >
                    {initials}
                  </Avatar>
                  <div>
                    <span>DISPLAY NAME</span>
                    <strong>{user.display_name}</strong>
                    <small>{user.email}</small>
                  </div>
                  <Badge color="dark" variant="light">
                    ForkRoom member
                  </Badge>
                </div>

                <div className={styles.profileFacts}>
                  <div>
                    <IconUser size={18} aria-hidden="true" />
                    <span>
                      <small>DISPLAY NAME</small>
                      <strong>{user.display_name}</strong>
                    </span>
                  </div>
                  <div>
                    <IconCalendar size={18} aria-hidden="true" />
                    <span>
                      <small>MEMBER SINCE</small>
                      <strong>{formatDate(user.created_at)}</strong>
                    </span>
                  </div>
                </div>

                <Alert
                  color="gray"
                  icon={<IconLock size={18} />}
                  title="Profile editing is not available"
                >
                  The current account API exposes this identity as read-only.
                  ForkRoom will not present name or avatar controls until the
                  backend can save those changes.
                </Alert>
              </section>

              <section className={styles.settingsSection}>
                <div className={styles.sectionHeading}>
                  <span>02</span>
                  <div>
                    <h2>Email address</h2>
                    <p>
                      Account recovery and verification messages are sent to
                      this address.
                    </p>
                  </div>
                </div>

                <div className={styles.emailRow}>
                  <div className={styles.emailIdentity}>
                    <IconAt size={20} aria-hidden="true" />
                    <span>
                      <strong>{user.email}</strong>
                      <small>Primary account email</small>
                    </span>
                  </div>
                  <Badge
                    color={user.is_email_verified ? 'green' : 'orange'}
                    variant="light"
                    leftSection={
                      user.is_email_verified ? (
                        <IconCheck size={13} />
                      ) : (
                        <IconAlertTriangle size={13} />
                      )
                    }
                  >
                    {user.is_email_verified ? 'Verified' : 'Not verified'}
                  </Badge>
                </div>

                {!user.is_email_verified && (
                  <div className={styles.inlineAction}>
                    <div>
                      <strong>Verify this email</strong>
                      <p>
                        Request a fresh link, then complete verification from
                        the email message.
                      </p>
                    </div>
                    <Button
                      color="rust"
                      variant="light"
                      leftSection={<IconMailForward size={16} />}
                      loading={verification.isPending}
                      onClick={() => void resendVerification()}
                    >
                      Resend verification
                    </Button>
                  </div>
                )}

                {verification.isSuccess && (
                  <Alert color="green" title="Verification link requested">
                    Check {user.email}. The account status will update after
                    the verification link is completed.
                  </Alert>
                )}
                {verification.isError && (
                  <Alert color="red" title="Verification email was not sent">
                    {getApiErrorMessage(
                      verification.error,
                      'ForkRoom could not request a new verification email.',
                    )}
                  </Alert>
                )}
              </section>
            </>
          ) : (
            <>
              <section className={styles.settingsSection}>
                <div className={styles.sectionHeading}>
                  <span>01</span>
                  <div>
                    <h2>Password recovery</h2>
                    <p>
                      ForkRoom changes passwords through a time-limited link
                      sent to the account email.
                    </p>
                  </div>
                </div>

                <div className={styles.inlineAction}>
                  <div>
                    <strong>Reset your password</strong>
                    <p>
                      A reset request will be sent to {user.email}. Your
                      current password is never displayed here.
                    </p>
                  </div>
                  <Button
                    color="rust"
                    leftSection={<IconKey size={16} />}
                    loading={passwordReset.isPending}
                    onClick={() => void sendPasswordReset()}
                  >
                    Send reset link
                  </Button>
                </div>

                {passwordReset.isSuccess && (
                  <Alert color="green" title="Check your inbox">
                    If the request can be completed, the email contains the
                    secure link needed to choose a new password.
                  </Alert>
                )}
                {passwordReset.isError && (
                  <Alert color="red" title="Reset link was not sent">
                    {getApiErrorMessage(
                      passwordReset.error,
                      'ForkRoom could not request a password reset.',
                    )}
                  </Alert>
                )}

                <Alert
                  color="gray"
                  icon={<IconLock size={18} />}
                  title="Direct password change is unavailable"
                >
                  The backend does not expose an authenticated password-change
                  endpoint. The verified reset-link flow is the supported path.
                </Alert>
              </section>

              <section className={styles.settingsSection}>
                <div className={styles.sectionHeading}>
                  <span>02</span>
                  <div>
                    <h2>Browser session</h2>
                    <p>
                      Manage the session currently being used to access
                      ForkRoom on this device.
                    </p>
                  </div>
                </div>

                <div className={styles.sessionRow}>
                  <div className={styles.sessionIcon}>
                    <IconDeviceDesktop size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <strong>Current browser session</strong>
                    <span>Authenticated as {user.email}</span>
                  </div>
                  <Badge color="green" variant="light">
                    Current
                  </Badge>
                </div>

                <div className={styles.inlineAction}>
                  <div>
                    <strong>Sign out of this session</strong>
                    <p>
                      ForkRoom will revoke this session and return to the sign
                      in screen only after the server confirms logout.
                    </p>
                  </div>
                  <Button
                    color="red"
                    variant="light"
                    leftSection={<IconLogout size={16} />}
                    loading={logout.isPending}
                    onClick={() => void signOut()}
                  >
                    Sign out
                  </Button>
                </div>

                {logout.isError && (
                  <Alert color="red" title="Session was not closed">
                    {getApiErrorMessage(
                      logout.error,
                      'ForkRoom could not sign out this browser. Your session remains active.',
                    )}
                  </Alert>
                )}

                <Alert
                  color="gray"
                  icon={<IconDeviceDesktop size={18} />}
                  title="Session management is unavailable"
                >
                  The current API cannot list other devices or revoke one of
                  them selectively, so ForkRoom shows only this browser session.
                </Alert>
              </section>

              <section className={styles.settingsSection}>
                <div className={styles.sectionHeading}>
                  <span>03</span>
                  <div>
                    <h2>Account lifecycle</h2>
                    <p>Destructive personal-account controls require backend support.</p>
                  </div>
                </div>

                <div className={styles.capabilityRow}>
                  <div>
                    <strong>Delete personal account</strong>
                    <p>
                      Account deletion is not exposed by the current API. No
                      destructive request is simulated in the browser.
                    </p>
                  </div>
                  <Badge color="gray" variant="light">
                    Not available
                  </Badge>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
