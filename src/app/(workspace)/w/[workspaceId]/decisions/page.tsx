import type { Metadata } from 'next';

import { DecisionsIndex } from '@/components/workspace/decisions-index';

export const metadata: Metadata = {
  title: 'Decisions',
};

export default async function DecisionsPage({
  params,
}: {
  params: Promise<{
    workspaceId: string;
  }>;
}) {
  const { workspaceId } = await params;

  return <DecisionsIndex workspaceId={workspaceId} />;
}
