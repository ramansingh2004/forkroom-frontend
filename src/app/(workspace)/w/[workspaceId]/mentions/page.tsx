import type { Metadata } from "next";
import { WorkspaceUtilityPage } from "@/components/workspace/workspace-utility-page";

export const metadata: Metadata = { title: "Mentions" };

export default async function MentionsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <WorkspaceUtilityPage workspaceId={workspaceId} kind="mentions" />;
}