import type { Metadata } from "next";
import { WorkspaceUtilityPage } from "@/components/workspace/workspace-utility-page";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <WorkspaceUtilityPage workspaceId={workspaceId} kind="integrations" />;
}