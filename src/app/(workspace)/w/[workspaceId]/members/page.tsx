import type { Metadata } from 'next';
import { MemberManagement } from '@/components/members/member-management';

export const metadata: Metadata = { title: 'Workspace members' };

export default async function MembersPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <MemberManagement workspaceId={workspaceId} />;
}
