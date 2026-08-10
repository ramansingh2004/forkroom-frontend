import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@mantine/core';
import { IconLinkOff } from '@tabler/icons-react';
import { AuthShell } from '@/components/auth/auth-shell';
import styles from '@/components/auth/auth.module.css';

export const metadata: Metadata = { title: 'Workspace invitation' };

export default function InvitationPage() {
  return (
    <AuthShell>
      <div className={styles.status}>
        <div className={`${styles.statusIcon} ${styles.statusIconError}`}>
          <IconLinkOff size={25} aria-hidden="true" />
        </div>
        <h1>Invitation links are not available</h1>
        <p>
          This ForkRoom server does not support token-based invitations. Ask a workspace owner or
          administrator to add the exact email address on your account.
        </p>
        <span className={styles.statusSupporting}>
          After you are added, sign in and the workspace will appear in your workspace list.
        </span>
        <div className={styles.statusActions}>
          <Button component={Link} href="/login" color="rust" fullWidth>Sign in</Button>
          <Button component={Link} href="/register" variant="light" color="rust" fullWidth>
            Create an account
          </Button>
          <Button component={Link} href="/" variant="subtle" color="dark" fullWidth>Back to home</Button>
        </div>
      </div>
    </AuthShell>
  );
}