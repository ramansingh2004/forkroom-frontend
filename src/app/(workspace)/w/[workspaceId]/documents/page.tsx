import type { Metadata } from "next";
import { WorkspaceUtilityPage } from "@/components/workspace/workspace-utility-page";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <WorkspaceUtilityPage workspaceId={workspaceId} kind="documents" />;
}