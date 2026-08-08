import type { Metadata } from 'next';

import { WorkspaceSelector } from '@/components/workspace/workspace-selector';

export const metadata: Metadata = {
  title: 'Workspaces',
};

export default function WorkspacesPage() {
  return <WorkspaceSelector />;
}