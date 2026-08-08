import type { Metadata } from 'next';

import { WorkspaceDashboard } from '@/components/workspace/workspace-dashboard';

export const metadata: Metadata = {
  title: 'Workspace overview',
};

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{
    workspaceId: string;
  }>;
}) {
  const { workspaceId } = await params;

  return (
    <WorkspaceDashboard
      workspaceId={workspaceId}
    />
  );
}