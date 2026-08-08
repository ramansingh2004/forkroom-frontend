import type { Metadata } from 'next';

import { DecisionRoom } from '@/components/decision-room/decision-room';

export const metadata: Metadata = {
  title: 'Decision',
};

export default async function DecisionPage({
  params,
}: {
  params: Promise<{
    workspaceId: string;
    decisionId: string;
  }>;
}) {
  const { workspaceId, decisionId } = await params;

  return (
    <DecisionRoom
      workspaceId={workspaceId}
      decisionId={decisionId}
    />
  );
}