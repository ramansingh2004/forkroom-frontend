import type { Metadata } from 'next';
import { LandingPage } from './landing-page';

export const metadata: Metadata = {
  title: 'Collaborative decisions with a clear why',
  description:
    'ForkRoom brings proposals, evidence, objections, voting, and accountable follow-through into one durable decision record.',
};

export default function HomePage() {
  return <LandingPage />;
}
