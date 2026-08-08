import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';
import { PublicOnly } from '@/components/auth/public-only';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return <PublicOnly><RegisterForm /></PublicOnly>;
}