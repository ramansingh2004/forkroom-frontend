import type { Metadata } from 'next';

import { DecisionRoom } from '@/components/decision-room/decision-room';

export const metadata: Metadata = {
  title: 'Decision',
};

export default async function DecisionPage({
  params,
  searchParams,
}: {
  params: Promise<{
    workspaceId: string;
    decisionId: string;
  }>;
  searchParams: Promise<{ comment?: string | string[] }>;
}) {
  const { workspaceId, decisionId } = await params;
  const query = await searchParams;
  const targetCommentId = Array.isArray(query.comment)
    ? (query.comment[0] ?? null)
    : (query.comment ?? null);

  return (
    <DecisionRoom
      workspaceId={workspaceId}
      decisionId={decisionId}
      targetCommentId={targetCommentId}
    />
  );
}
