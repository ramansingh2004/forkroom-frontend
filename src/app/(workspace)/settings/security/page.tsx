import type { Metadata } from 'next';
import { AccountSettings } from '@/components/settings/account-settings';

export const metadata: Metadata = { title: 'Security settings' };

export default function SecuritySettingsPage() {
  return <AccountSettings section="security" />;
}
