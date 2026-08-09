import type { Metadata } from 'next';
import { AccountSettings } from '@/components/settings/account-settings';

export const metadata: Metadata = { title: 'Profile settings' };

export default function ProfileSettingsPage() {
  return <AccountSettings section="profile" />;
}
