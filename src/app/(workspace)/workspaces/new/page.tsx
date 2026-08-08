import type { Metadata } from 'next';

import { CreateWorkspaceForm } from '@/components/workspace/create-workspace-form';

export const metadata: Metadata = {
  title: 'Create workspace',
};

export default function NewWorkspacePage() {
  return <CreateWorkspaceForm />;
}