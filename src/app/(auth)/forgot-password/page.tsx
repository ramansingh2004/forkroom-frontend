import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { PublicOnly } from '@/components/auth/public-only';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return <PublicOnly><ForgotPasswordForm /></PublicOnly>;
}