"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCalendar,
  IconCrown,
  IconDeviceFloppy,
  IconLock,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useUpdateWorkspace,
  useWorkspace,
  useWorkspaceMembers,
} from "@/hooks/use-workspaces";
import { getApiErrorMessage } from "@/services/auth.service";
import {
  PageSkeleton,
  RecoveryState,
} from "@/components/feedback/app-feedback";
import { WorkspaceDeleteModal } from "./workspace-delete-modal";
import styles from "./workspace-settings.module.css";

const workspaceSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(120, "Keep the name under 120 characters."),
  description: z
    .string()
    .trim()
    .max(500, "Keep the description under 500 characters."),
});

type WorkspaceSettingsValues = z.infer<typeof workspaceSettingsSchema>;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function WorkspaceSettings({ workspaceId }: { workspaceId: string }) {
  const currentUser = useCurrentUser();
  const workspace = useWorkspace(workspaceId);
  const members = useWorkspaceMembers(workspaceId);
  const updateWorkspace = useUpdateWorkspace(workspaceId);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const form = useForm<WorkspaceSettingsValues>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: { name: "", description: "" },
  });

  const member = members.data?.find(
    (item) => item.user_id === currentUser.data?.id,
  );
  const canManage = ["owner", "admin"].includes(member?.role ?? "viewer");
  const isOwner = member?.role === "owner";
  const owner = members.data?.find(
    (item) => item.user_id === workspace.data?.owner_id,
  );
  const initialValues = useMemo(
    () => ({
      name: workspace.data?.name ?? "",
      description: workspace.data?.description ?? "",
    }),
    [workspace.data?.description, workspace.data?.name],
  );

  useEffect(() => {
    if (workspace.data) form.reset(initialValues);
  }, [form, initialValues, workspace.data]);

  useEffect(() => {
    if (!form.formState.isDirty) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [form.formState.isDirty]);

  if (currentUser.isPending || workspace.isPending || members.isPending) {
    return <PageSkeleton label="Loading workspace settings" />;
  }

  if (
    currentUser.isError ||
    workspace.isError ||
    members.isError ||
    !currentUser.data ||
    !workspace.data
  ) {
    return (
      <div className={styles.settingsPage}>
        <RecoveryState
          error={currentUser.error ?? workspace.error ?? members.error}
          title="Workspace settings unavailable"
          fallback="ForkRoom could not load this workspace or your access changed."
          onRetry={() => {
            void currentUser.refetch();
            void workspace.refetch();
            void members.refetch();
          }}
        />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className={styles.settingsPage}>
        <section className={styles.permissionState}>
          <IconLock size={28} aria-hidden="true" />
          <span className={styles.eyebrow}>WORKSPACE SETTINGS</span>
          <h1>Administrator access required</h1>
          <p>
            Workspace identity and governance settings are available only to the
            Owner and Administrators. Your workspace content remains available
            through the regular navigation.
          </p>
        </section>
      </div>
    );
  }

  const submit = form.handleSubmit(async (values) => {
    const nextName = values.name.trim();
    const nextDescription = values.description.trim();

    try {
      const updated = await updateWorkspace.mutateAsync({
        ...(nextName !== workspace.data.name ? { name: nextName } : {}),
        ...(nextDescription !== (workspace.data.description ?? "")
          ? { description: nextDescription || null }
          : {}),
      });
      form.reset({
        name: updated.name,
        description: updated.description ?? "",
      });
      notifications.show({
        color: "green",
        title: "Workspace settings saved",
        message: "The workspace identity is now up to date.",
      });
    } catch {
      // Keep edited values in place and expose the server error below.
    }
  });

  return (
    <div className={styles.settingsPage}>
      <header className={styles.settingsHeader}>
        <div>
          <span className={styles.eyebrow}>WORKSPACE GOVERNANCE</span>
          <h1>Workspace settings</h1>
          <p>
            Maintain the identity and ownership boundary for{" "}
            <strong>{workspace.data.name}</strong>.
          </p>
        </div>
        <Badge
          color={isOwner ? "dark" : "rust"}
          variant="light"
          leftSection={
            isOwner ? <IconCrown size={13} /> : <IconShieldCheck size={13} />
          }
        >
          {isOwner ? "Owner access" : "Administrator access"}
        </Badge>
      </header>

      <div className={styles.settingsLayout}>
        <nav className={styles.settingsNav} aria-label="Settings sections">
          <a href="#identity">Identity</a>
          <a href="#governance">Governance</a>
          <a href="#danger">Danger zone</a>
        </nav>

        <main className={styles.settingsContent}>
          <form onSubmit={submit} noValidate>
            <section id="identity" className={styles.settingsSection}>
              <div className={styles.sectionHeading}>
                <span>01</span>
                <div>
                  <h2>Workspace identity</h2>
                  <p>
                    These fields are visible to everyone who can access this
                    workspace.
                  </p>
                </div>
              </div>

              <div className={styles.formFields}>
                <TextInput
                  label="Workspace name"
                  placeholder="Platform Architecture"
                  {...form.register("name")}
                  error={form.formState.errors.name?.message}
                />
                <Textarea
                  label="Description"
                  description="Optional - explain the team or decisions this workspace contains."
                  placeholder="Architecture decisions for the platform team."
                  autosize
                  minRows={4}
                  maxRows={8}
                  {...form.register("description")}
                  error={form.formState.errors.description?.message}
                />
              </div>

              {updateWorkspace.isError && (
                <Alert color="red" title="Settings were not saved">
                  {getApiErrorMessage(
                    updateWorkspace.error,
                    "ForkRoom could not update this workspace. Your saved settings remain unchanged.",
                  )}
                </Alert>
              )}

              <div className={styles.saveBar}>
                <span aria-live="polite">
                  {updateWorkspace.isPending
                    ? "Saving workspace settings..."
                    : form.formState.isDirty
                      ? "You have unsaved changes."
                      : "All workspace changes are saved."}
                </span>
                <div>
                  {form.formState.isDirty && (
                    <Button
                      variant="default"
                      onClick={() => form.reset(initialValues)}
                      disabled={updateWorkspace.isPending}
                    >
                      Discard
                    </Button>
                  )}
                  <Tooltip
                    label={
                      form.formState.isDirty
                        ? "Save workspace identity changes"
                        : "Change the name or description before saving."
                    }
                  >
                    <span>
                      <Button
                        type="submit"
                        color="rust"
                        leftSection={<IconDeviceFloppy size={16} />}
                        disabled={!form.formState.isDirty}
                        loading={updateWorkspace.isPending}
                      >
                        Save settings
                      </Button>
                    </span>
                  </Tooltip>
                </div>
              </div>
            </section>
          </form>

          <section id="governance" className={styles.settingsSection}>
            <div className={styles.sectionHeading}>
              <span>02</span>
              <div>
                <h2>Governance</h2>
                <p>The Owner identity is fixed by the current workspace API.</p>
              </div>
            </div>

            <div className={styles.ownerCard}>
              <Avatar
                src={owner?.avatar_url}
                color="rust"
                size={48}
                radius="xl"
              >
                {owner?.display_name.slice(0, 2).toUpperCase() ?? "OW"}
              </Avatar>
              <div>
                <span>WORKSPACE OWNER</span>
                <strong>{owner?.display_name ?? "Owner account"}</strong>
                <small>{owner?.email ?? workspace.data.owner_id}</small>
              </div>
              <Badge
                color="dark"
                variant="light"
                leftSection={<IconCrown size={13} />}
              >
                Owner
              </Badge>
            </div>

            <div className={styles.metadataGrid}>
              <div>
                <IconCalendar size={17} aria-hidden="true" />
                <span>
                  <small>CREATED</small>
                  <strong>{formatDate(workspace.data.created_at)}</strong>
                </span>
              </div>
              <div>
                <IconCalendar size={17} aria-hidden="true" />
                <span>
                  <small>LAST UPDATED</small>
                  <strong>{formatDate(workspace.data.updated_at)}</strong>
                </span>
              </div>
            </div>

            <Alert
              color="gray"
              icon={<IconLock size={18} />}
              title="Ownership transfer is unavailable"
            >
              The current backend does not expose ownership transfer. ForkRoom
              therefore keeps the Owner immutable instead of presenting a
              non-functional transfer control.
            </Alert>
          </section>

          <section
            id="danger"
            className={`${styles.settingsSection} ${styles.dangerSection}`}
          >
            <div className={styles.sectionHeading}>
              <span>03</span>
              <div>
                <h2>Danger zone</h2>
                <p>Destructive workspace operations are isolated here.</p>
              </div>
            </div>

            <div className={styles.dangerAction}>
              <div>
                <strong>Delete this workspace</strong>
                <p>
                  Permanently request deletion through the workspace API and
                  remove this workspace from your ForkRoom navigation.
                </p>
              </div>
              {isOwner ? (
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => setDeleteOpened(true)}
                >
                  Delete workspace
                </Button>
              ) : (
                <Tooltip label="Only the workspace owner can permanently delete this workspace.">
                  <span>
                    <Button
                      color="red"
                      variant="light"
                      leftSection={<IconLock size={16} />}
                      disabled
                    >
                      Owner only
                    </Button>
                  </span>
                </Tooltip>
              )}
            </div>

            {!isOwner && (
              <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
                Administrators may update identity fields, but only the Owner
                may delete the workspace.
              </Alert>
            )}
          </section>
        </main>
      </div>

      <WorkspaceDeleteModal
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        workspaceId={workspaceId}
        workspaceName={workspace.data.name}
      />
    </div>
  );
}
