import type { Metadata } from 'next';

import { CreateDecisionForm } from '@/components/workspace/create-decision-form';

export const metadata: Metadata = {
  title: 'Create decision',
};

export default async function NewDecisionPage({
  params,
}: {
  params: Promise<{
    workspaceId: string;
  }>;
}) {
  const { workspaceId } = await params;

  return (
    <CreateDecisionForm
      workspaceId={workspaceId}
    />
  );
}