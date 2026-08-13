"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Center, Loader } from "@mantine/core";

import { useWorkspaces } from "@/hooks/use-workspaces";
import { useUiStore } from "@/stores/use-ui-store";
import { getApiErrorMessage } from "@/services/auth.service";

export default function IntegrationReturnPage() {
  const router = useRouter();
  const workspaces = useWorkspaces();
  const activeWorkspaceId = useUiStore((state) => state.activeWorkspaceId);

  useEffect(() => {
    if (!workspaces.isSuccess) return;

    const workspaceId = workspaces.data.some(
      (workspace) => workspace.id === activeWorkspaceId,
    )
      ? activeWorkspaceId
      : workspaces.data[0]?.id;

    if (!workspaceId) return;
    router.replace(`/w/${workspaceId}/integrations${window.location.search}`);
  }, [activeWorkspaceId, router, workspaces.data, workspaces.isSuccess]);

  if (workspaces.isError) {
    return (
      <Center mih="50vh" px="md">
        <Alert color="red" title="Could not return to integrations">
          {getApiErrorMessage(
            workspaces.error,
            "ForkRoom could not resolve an accessible workspace.",
          )}
          <Button
            mt="sm"
            size="compact-sm"
            variant="default"
            onClick={() => void workspaces.refetch()}
          >
            Retry
          </Button>
        </Alert>
      </Center>
    );
  }

  if (workspaces.isSuccess && workspaces.data.length === 0) {
    return (
      <Center mih="50vh" px="md">
        <Alert color="orange" title="No workspace is available">
          Join or create a workspace before connecting an integration.
          <Button
            component={Link}
            href="/workspaces"
            mt="sm"
            size="compact-sm"
            variant="default"
          >
            Open workspaces
          </Button>
        </Alert>
      </Center>
    );
  }

  return (
    <Center mih="50vh">
      <Loader aria-label="Returning to workspace integrations" />
    </Center>
  );
}
